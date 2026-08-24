/*
 * WHY: The minimum-offer rule had four independent implementations that did not
 *      agree. `makeOffer` enforced a 70% floor rounded with
 *      `Math.ceil(price * pct / 100 * 100) / 100`; `MakeOfferButton` computed
 *      its own floor with `roundRupees()` and seeded the input from it; and both
 *      seller editors wrote `minOfferPercent ?? 50` when the toggle was flipped
 *      on. So the forms advertised a 50% floor the server would reject, and even
 *      at a matching percentage the two rounding rules could differ by a rupee —
 *      the button seeding an amount its own submit then bounced.
 * WHAT: One percentage default and one floor function, imported by every gate.
 *       Same discipline as `resolveMinBid` in the auctions config next door.
 *
 * EXPORTS:
 *   DEFAULT_MIN_OFFER_PERCENT, minOfferAmount, isOfferAmountValid
 *
 * @tag domain:offers,seller
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:offer-actions,MakeOfferButton,ProductDetailPageView,ProductForm,SellerProductShell
 * @tag sideEffects:none
 */

/**
 * The floor, as a percentage of the listed price, below which an offer is
 * rejected — used whenever a listing does not set its own `minOfferPercent`.
 *
 * 70, not 50. This resolves a real disagreement rather than picking a number:
 * 70 is what `makeOffer` has always enforced, so a listing created through
 * either seller editor (which seeded 50) has in practice behaved as 70 the whole
 * time — the forms were lying to sellers. Lowering the server to 50 would
 * silently loosen the rule on every listing that already exists; raising the
 * forms to 70 changes only what new listings are seeded with and makes the UI
 * honest about the rule already in force.
 */
export const DEFAULT_MIN_OFFER_PERCENT = 70;

/**
 * The lowest amount this listing will accept as an offer.
 *
 * Rounded UP to the paisa, so the returned value always satisfies the
 * percentage rule it was derived from — rounding down could return a number
 * fractionally below the true floor, which the server would then reject while
 * the UI displayed it as the minimum.
 */
export function minOfferAmount(listedPrice: number, percent?: number | null): number {
  const pct =
    typeof percent === "number" && Number.isFinite(percent) && percent > 0
      ? percent
      : DEFAULT_MIN_OFFER_PERCENT;
  return Math.ceil(listedPrice * (pct / 100) * 100) / 100;
}

/**
 * Whether `amount` is a legal offer on a listing priced at `listedPrice`.
 *
 * Both bounds matter and both are enforced server-side: at or above the listed
 * price there is nothing to negotiate (the buyer should use Add to Cart), and
 * below the floor the seller has said they don't want to hear it.
 */
export function isOfferAmountValid(
  amount: number,
  listedPrice: number,
  percent?: number | null,
): boolean {
  return amount >= minOfferAmount(listedPrice, percent) && amount < listedPrice;
}
