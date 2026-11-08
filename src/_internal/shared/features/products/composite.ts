/*
 * WHY: The owner's requirement, 2026-11-08: *"a listing A is made of 3 listings
 *      B C and D, if you buy A you get all 3 plus its original packaging but you
 *      can still buy B C and D individually based on your need, the BX-53 deck
 *      set is a great example for this"*.
 *
 *      The mechanism for this largely EXISTED and was spread across four names
 *      that partly disagreed — `categoryType:"bundle"` (own price, derived
 *      stock), the product-group parent (own price, independent stock), grouped
 *      listings and variant groups. This module is the one place "is this
 *      listing composite, and what does buying it consume?" is answered, so the
 *      four stop drifting.
 *
 * WHAT: One reader, one guard, zero copies. Pure — no Firestore, no framework,
 *       safe on both sides of the wire.
 *
 * 🛑 CONTAINMENT IS NOT SELECTION. Two different relations the schema has been
 * conflating through a single `groupId`:
 *
 *   `groupId`      — "these listings are browsed and picked together"
 *   `components[]` — "buying this one DELIVERS those others' goods"
 *
 * A product group expresses both at once, which is why `groupChildSlugs` has no
 * quantities and why the parent used to be selectable inside its own contents
 * picker (fixed in `6e8ce85b2`). Keep them apart.
 *
 * 🛑 A COMPOSITE IS NOT A LISTING TYPE. `"bundle"` left the `ListingType` union
 * in SB-UNI-D and became a category type; appkit `c0f21425f` removed the last
 * dead `listingType === "bundle"` branch. Compositeness is a property of a
 * LISTING, declared in its own data, so any type can be composite and enabling
 * it is a data change. Nothing here compares a listing type to a string, and
 * nothing that calls it should either.
 *
 * EXPORTS: CompositeSource, isComposite, compositeComponents,
 *          componentStockPolicyFor, compositeComponentDecrements,
 *          assertCompositeShape, CompositeShapeError
 *
 * @tag domain:products
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import type {
  ComponentStockPolicy,
  ProductComponent,
} from "../../../../features/products/schemas/firestore";

/**
 * The fields this module reads. Structural on purpose, for the same reason
 * `readGroupRules` is: the shape arrives either as a full `ProductDocument`
 * server-side or as a public projection client-side, and taking the feature
 * schema here would drag it into a module a client component imports.
 */
export interface CompositeSource {
  components?: ProductComponent[] | null;
  componentStockPolicy?: ComponentStockPolicy | null;
}

/**
 * Does this listing deliver other listings' goods?
 *
 * 🛑 Answered from the listing's own DATA — never from its type, and never from
 * `isGroupParent`. A group parent is a listing that other listings point at for
 * browsing; a composite is a listing that CONTAINS others. The BX-53 box
 * happens to be both, and plenty of groups have a parent that contains nothing.
 */
export function isComposite(doc: CompositeSource | null | undefined): boolean {
  return compositeComponents(doc).length > 0;
}

/**
 * The composite's components, normalised and defensive.
 *
 * Rows with no `listingId` or a non-positive / non-integer `qty` are DROPPED
 * rather than repaired: a component you cannot identify cannot be delivered,
 * and inventing `qty: 1` for a malformed row would silently promise the buyer
 * goods nobody declared. A composite whose rows are all malformed therefore
 * reads as not-composite, which is the safe direction — it behaves as an
 * ordinary listing rather than as a composite with wrong contents.
 *
 * Duplicate `listingId`s are SUMMED, not de-duplicated: two rows of the same
 * component legitimately means "two of these", and dropping one would
 * under-deliver.
 */
export function compositeComponents(
  doc: CompositeSource | null | undefined,
): ProductComponent[] {
  const rows = doc?.components;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const byId = new Map<string, number>();
  for (const row of rows) {
    const id = typeof row?.listingId === "string" ? row.listingId.trim() : "";
    if (!id) continue;
    const qty = row?.qty;
    if (!Number.isInteger(qty) || qty < 1) continue;
    byId.set(id, (byId.get(id) ?? 0) + qty);
  }
  return [...byId.entries()].map(([listingId, qty]) => ({ listingId, qty }));
}

/**
 * This composite's stock policy. `null` when the listing is not a composite —
 * the question does not apply, and answering it with a value would let a caller
 * act on a policy for a listing that has no components.
 *
 * 🛑 NO DEFAULT for a composite that failed to declare one. Returning
 * `"independent"` would be the more convenient lie and it is a money-path
 * behaviour: guessing `independent` oversells an assembled kit, guessing
 * `derived` makes selling one loose part silently reduce how many sealed boxes
 * the seller appears to have. A composite with no policy is a configuration
 * error, caught at the write boundary by `assertCompositeShape`; this returns
 * `undefined` so a reader that somehow meets a legacy row must handle it rather
 * than be handed a guess.
 */
export function componentStockPolicyFor(
  doc: CompositeSource | null | undefined,
): ComponentStockPolicy | null | undefined {
  if (!isComposite(doc)) return null;
  const policy = doc?.componentStockPolicy;
  return policy === "independent" || policy === "derived" ? policy : undefined;
}

/**
 * What ONE unit of this composite consumes from its components' stock.
 *
 * `independent` returns an EMPTY map — deliberately, and it is the whole model:
 * a sealed box is its own object, so buying it consumes its own count and
 * nothing else. The caller then decrements the composite listing exactly as it
 * would any ordinary single listing, which is what already happens today and
 * is why `independent` needs no new decrement path.
 *
 * `derived` returns componentId → units, which is the same shape
 * `getExpandedDecrements` already builds for a multi-member cart line, so the
 * existing fan-out, the per-member GST proration and `stock-restore`'s mirror
 * all apply unchanged.
 *
 * An undeclared policy returns an empty map and is NOT treated as `derived`:
 * see `componentStockPolicyFor`. The write boundary is what prevents the case.
 */
export function compositeComponentDecrements(
  doc: CompositeSource | null | undefined,
  units = 1,
): Map<string, number> {
  const out = new Map<string, number>();
  if (componentStockPolicyFor(doc) !== "derived") return out;
  if (!Number.isFinite(units) || units < 1) return out;
  for (const component of compositeComponents(doc)) {
    out.set(component.listingId, component.qty * units);
  }
  return out;
}

/** Thrown by `assertCompositeShape`. Carries a code so a route can map it. */
export class CompositeShapeError extends Error {
  readonly code:
    | "COMPOSITE_POLICY_REQUIRED"
    | "COMPOSITE_CONTAINS_ITSELF"
    | "COMPOSITE_DERIVED_UNSUPPORTED";
  constructor(code: CompositeShapeError["code"], message: string) {
    super(message);
    this.name = "CompositeShapeError";
    this.code = code;
  }
}

/**
 * Validate a composite at the WRITE boundary. Throws on the first problem.
 *
 * Checked here and not at read time because a stored composite that is wrong is
 * already a promise made to buyers; the cheapest place to say no is the moment
 * it is saved, which is the same reasoning as `findBundleMemberStores`.
 *
 * `listingId` is this listing's own id, so a composite cannot contain itself.
 *
 * ## 🛑 Why `derived` is REFUSED on a plain listing today
 *
 * `independent` needs no new machinery: the composite decrements its own count,
 * which is what an ordinary listing already does. `derived` genuinely does — the
 * fan-out has to resolve `components[]` and fetch those listings inside the
 * checkout transaction, and the five `getExpandedDecrements` call sites that
 * would have to pass them live in `checkout/actions.ts`, which another lane
 * holds. Until that one coordinated edit lands, a listing saved with
 * `derived` would decrement nothing but itself — and silently overselling the
 * parts is exactly the failure this field exists to prevent.
 *
 * So it is REFUSED, loudly, rather than accepted and ignored. That distinction
 * is the whole lesson of `bulkDiscounts`, which sat stored-and-never-read on
 * this same document: a field that looks configured and does nothing is worse
 * than one that is absent. Deleting the refusal is a one-line change the day
 * the fan-out is wired.
 *
 * The existing `categoryType:"bundle"` mechanism is unaffected — it already
 * fans out through `groupMembers` on the cart line and does not route through
 * this field.
 */
export function assertCompositeShape(
  doc: CompositeSource | null | undefined,
  listingId: string,
): void {
  const components = compositeComponents(doc);
  if (components.length === 0) return;

  if (listingId && components.some((c) => c.listingId === listingId)) {
    throw new CompositeShapeError(
      "COMPOSITE_CONTAINS_ITSELF",
      "A listing cannot be one of its own components.",
    );
  }

  const policy = componentStockPolicyFor(doc);
  if (policy === undefined) {
    throw new CompositeShapeError(
      "COMPOSITE_POLICY_REQUIRED",
      'A listing with components must say how its stock works: "independent" if it is a separately boxed item with its own count, or "derived" if it is assembled from those components when ordered.',
    );
  }

  if (policy === "derived") {
    throw new CompositeShapeError(
      "COMPOSITE_DERIVED_UNSUPPORTED",
      'Assembled-from-components stock ("derived") is not available on a listing yet — its stock would not be taken from the components and they would oversell. Use a bundle for an assembled kit, or set this listing to "independent" if it is a separately boxed item.',
    );
  }
}
