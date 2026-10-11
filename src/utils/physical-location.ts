/*
 * WHY: `physicalLocation` is a `{zone, shelf, bin}` OBJECT on both
 *      `ProductDocument` and `OrderDocument`, and three surfaces render it.
 *      Two had hand-written the same `a/b/c` interpolation
 *      (`SellerProductsView`, `SellerOrdersView`) and the third —
 *      `PrintCenterView` — declared the field as a `string` and rendered the
 *      object as a bare React child.
 *
 * 🛑 THAT THIRD ONE IS A CRASH. Rendering an object as a React child throws
 *    "Objects are not valid as a React child", so the Print Centre would die
 *    the first time any seller used the Set Location bulk action. It is
 *    LATENT, not live: measured on production, 0 of 72 products and 0 of 67
 *    orders carry the field, so nobody has used that feature yet. It was
 *    invisible because BOTH mappers in `PrintCenterPanel` are typed `(p: any)`
 *    and the products array is passed `as any` — so neither the wrong
 *    declaration nor the wrong value had anything to trip over.
 *
 * WHAT: one formatter. Pure, no imports, structural parameter so a caller can
 *       pass a `ProductDocument`'s field, an `OrderDocument`'s, or the
 *       `PhysicalLocation` client type without a cast.
 *
 * @tag domain:inventory
 * @tag layer:util
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

/** The parts a location can have. All optional — see the blank-parts note. */
export interface PhysicalLocationParts {
  zone?: string | null;
  shelf?: string | null;
  bin?: string | null;
}

/**
 * Render a location as `zone/shelf/bin`, or `undefined` when there is nothing
 * to show.
 *
 * 🛑 Returns `undefined` rather than `"//"` for an all-blank location, and
 * that case is REACHABLE, not defensive: `PhysicalLocationModal` tells the
 * user "All fields are optional" while both bulk-location routes only check
 * `typeof === "string"`, so `{zone:"",shelf:"",bin:""}` saves successfully.
 * Every caller already branches on falsy before rendering, so returning
 * `undefined` makes those rows fall through to their em-dash instead of
 * printing punctuation with no content.
 *
 * Partial locations keep their separators (`A//3`) on purpose — the gap is
 * information, and collapsing it would make "zone A, bin 3" indistinguishable
 * from "zone A, shelf 3".
 */
export function formatPhysicalLocation(
  loc: PhysicalLocationParts | null | undefined,
): string | undefined {
  if (!loc) return undefined;
  const zone = (loc.zone ?? "").trim();
  const shelf = (loc.shelf ?? "").trim();
  const bin = (loc.bin ?? "").trim();
  if (!zone && !shelf && !bin) return undefined;
  return `${zone}/${shelf}/${bin}`;
}

/**
 * Normalise an inbound location, or `undefined` when it carries nothing — C4.
 *
 * 🛑 THE ONE VALIDATOR. There were two and NEITHER was the one in use.
 *
 * `physicalLocationSchema` exists in `features/orders/schemas/index.ts` and is
 * used by neither bulk-location route; both routes instead hand-checked
 * `typeof loc.zone === "string"`, which **accepts the empty string**. So
 * `PhysicalLocationModal`'s promise that "all fields are optional" was honoured
 * only by accident — `typeof "" === "string"` is what made it true — while
 * OMITTING a key, which is the sensible reading of "optional", returned 400.
 *
 * This replaces the hand-check at both routes: a missing key and an empty
 * string now mean the same thing, which is what the UI says.
 *
 * Returns `undefined` for an all-blank location so a caller writes NOTHING
 * rather than `{zone:"",shelf:"",bin:""}` — a stored all-blank object is what
 * made `formatPhysicalLocation` need its own "never print `//`" guard, and the
 * cleanest fix is to stop creating it.
 */
export function normalisePhysicalLocation(
  loc: PhysicalLocationParts | null | undefined,
): { zone: string; shelf: string; bin: string } | undefined {
  if (!loc || typeof loc !== "object") return undefined;
  const zone = (loc.zone ?? "").trim();
  const shelf = (loc.shelf ?? "").trim();
  const bin = (loc.bin ?? "").trim();
  if (!zone && !shelf && !bin) return undefined;
  return { zone, shelf, bin };
}

/**
 * Search tokens for a location — what makes it findable in BOTH directions,
 * which is C4's whole requirement.
 *
 * "Where is item X" is answered by the Location column once the field renders.
 * "What is in bin A-3" is the hard direction, and it falls out of the same
 * index.
 *
 * 🛑 Tokens, not a Firestore range query, and that is deliberate. A
 * `physicalLocation.bin == "3"` clause paired with any sort needs its own
 * composite index per sort field, and the `FAILED_PRECONDITION` would be
 * swallowed into an empty page (Root Cause #59). `searchTxt` is already an
 * `array-contains`-indexed field, so this costs **more tokens in an array that
 * is already indexed** and no new index at all.
 *
 * ## 🛑 How the match actually happens — measured, because my first version
 * ## of this comment was wrong about it
 *
 * The first draft emitted `a-3-2` and `a/3/2` and claimed the composite was
 * what let a seller search a bin label. **It is not, and the composites were
 * dead weight.** `buildSearchTxt` normalises with
 * `.replace(/[^a-z0-9]+/g, " ")` and then splits — so `a-3-2` is stored as
 * three tokens `a`, `3`, `2`, exactly the same as the parts. The verification
 * caught it by asserting the composite was indexed and finding it absent.
 *
 * What makes it work is that `parseSearchTxtQuery` applies the **same**
 * normaliser: a seller typing `A-3` yields terms `["a", "3"]`, which
 * AND-refine against the parts. So the parts alone are sufficient, and the
 * separators are irrelevant on both sides — a label written `A/3` and searched
 * `A-3` matches either way.
 *
 * The UNSEPARATED form (`a32`) is kept, and it is the one composite that
 * survives tokenisation: bin labels are often written without separators, and
 * a seller typing `A32` must not come back empty when `A-3-2` would have
 * matched.
 *
 * Honest limitation, stated rather than papered over: single-character parts
 * make low-signal tokens — `a` is an edge n-gram of every word beginning with
 * "a" — so a one-letter zone searched alone is a broad pushdown that the
 * in-memory refine then narrows. It is correct, just not selective. A seller
 * who wants precision has the nested Sieve filters (`physicalLocation.zone`).
 */
export function physicalLocationTokens(
  loc: PhysicalLocationParts | null | undefined,
): string[] {
  const n = normalisePhysicalLocation(loc);
  if (!n) return [];
  const parts = [n.zone, n.shelf, n.bin].filter((s) => s.length > 0);
  const joined = parts.join("");
  // Only when it differs — a single-part location would otherwise emit a
  // duplicate, and `buildSearchTxt` caps at 600 tokens SILENTLY.
  return parts.length > 1 ? [...parts, joined] : parts;
}
