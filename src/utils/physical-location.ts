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
