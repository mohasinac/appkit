/**
 * Final sale — whether a listing accepts change-of-mind returns.
 *
 * 🛑 ABSENT MEANS FINAL SALE. `finalSale` is optional on `ProductDocument`
 * and the platform default is TRUE, so `undefined` and `true` mean the same
 * thing and only an explicit `false` opts a listing out.
 *
 * That inversion is why this helper exists and why it is the ONLY legal way
 * to read the field. The obvious spellings are all wrong for `undefined`:
 *
 *   !product.finalSale            // true for undefined  -> WRONG, opts out
 *   product.finalSale === true    // false for undefined -> WRONG, opts out
 *   product.finalSale ?? true     // correct, but re-derived at each call site
 *
 * Every one of those reads "not final sale" for the ~69 seeded products and
 * every listing created before the field existed — i.e. it fails open, in the
 * direction that silently grants returns the seller never agreed to.
 *
 * The default is deliberately NOT baked into `DEFAULT_PRODUCT_DATA`: writing
 * `finalSale: true` there would make `undefined` unreachable in new documents
 * and hide the rule from anyone reading the schema, while the millions of
 * already-stored documents would still arrive without it. One helper that
 * handles absence is honest; a default that only covers new rows is not.
 *
 * What final sale actually blocks is a REASON, not a refund — see
 * `_internal/shared/features/orders/return-reasons.ts`. Seller- and
 * carrier-fault claims (not received, not as described, damaged, wrong item,
 * counterfeit) are always accepted regardless of this flag.
 */
export function isFinalSale(
  listing: { finalSale?: boolean } | null | undefined,
): boolean {
  return listing?.finalSale !== false;
}

/**
 * The inverse, for reading as a positive at a call site that renders a
 * "Returnable" affordance. Exists so no one writes `!isFinalSale(...)` and
 * then has to reason about the double negative at a glance.
 */
export function acceptsChangeOfMindReturns(
  listing: { finalSale?: boolean } | null | undefined,
): boolean {
  return !isFinalSale(listing);
}
