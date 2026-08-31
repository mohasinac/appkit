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
 *   DEFAULT_MIN_OFFER_PERCENT, minOfferAmount, isOfferAmountValid,
 *   offerIsOnlyPurchasePath, offersEnabledFor, resolveOfferBounds,
 *   type OfferBounds
 *
 * @tag domain:offers,seller
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:offer-actions,MakeOfferButton,ProductDetailPageView,ClassifiedDetailPageView,ProductForm,SellerProductShell
 * @tag sideEffects:none
 */

import type { ListingType } from "../../../../features/products/types/index";
import {
  canAddToCart,
  canMakeOffer,
} from "../../listing-types/capabilities";

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

/* -------------------------------------------------------------------------
 * Listings whose ONLY purchase path is an offer
 * ---------------------------------------------------------------------- */

/**
 * Is Make-an-Offer the only way to buy this listing type?
 *
 * True exactly when the type can be offered on but has no cart line — today
 * that is `classified` alone (`canAddToCart: false`, `canMakeOffer: true`).
 *
 * Derived from the capability registry rather than testing for `"classified"`,
 * so a future type that lands in the same shape inherits the rule instead of
 * silently becoming unbuyable. That is not hypothetical: this function exists
 * because classified's actual purchase path was a `conversations` chat thread,
 * and when that feature was deleted the listing type would have been left with
 * no way to transact at all.
 */
export function offerIsOnlyPurchasePath(listingType: ListingType): boolean {
  return canMakeOffer(listingType) && !canAddToCart(listingType);
}

/**
 * May a buyer send an offer on this listing at all?
 *
 * The two ordinary gates are the type's `canMakeOffer` capability and the
 * seller's own `allowOffers` opt-in. The third clause is the point:
 *
 * 🛑 **`allowOffers` is an opt-in to NEGOTIATION, not to being contactable.**
 * On a listing with no cart, unchecking it would mean the buyer has no way to
 * transact whatsoever — the page would render a price and no path to it. So
 * where the offer IS the purchase path, an offer is always permitted; what
 * `allowOffers` then controls is whether the buyer may propose a price *below*
 * the asking one. See `resolveOfferBounds`.
 */
export function offersEnabledFor(
  listingType: ListingType,
  allowOffers?: boolean,
): boolean {
  if (!canMakeOffer(listingType)) return false;
  return allowOffers === true || offerIsOnlyPurchasePath(listingType);
}

export interface OfferBounds {
  /** Lowest legal amount, inclusive. */
  min: number;
  /** Highest legal amount, inclusive. */
  max: number;
  /**
   * The offer is pinned to the asking price — the buyer is requesting to buy,
   * not negotiating. True when the offer is the only purchase path and the
   * seller has not opted into haggling.
   *
   * Callers use this for COPY, never for a second bounds calculation: `min`
   * and `max` are already equal when it is true.
   */
  isBuyRequest: boolean;
}

/**
 * The amounts this listing will accept, as one answer for the form, the schema
 * and the server.
 *
 * Two cases beyond the ordinary one, both driven by there being no cart:
 *
 * - **No haggling opted in** → `min === max === listedPrice`. A "request to buy".
 * - **Haggling opted in** → the usual floor, but the ceiling is the asking price
 *   **inclusive**. On a cartable listing an offer at full price is rejected with
 *   "use Add to Cart instead", which on a classified is advice the buyer cannot
 *   take — there is no cart button to use. That rejection was already a dead end
 *   before this change.
 */
export function resolveOfferBounds(opts: {
  listingType: ListingType;
  listedPrice: number;
  minOfferPercent?: number | null;
  allowOffers?: boolean;
}): OfferBounds {
  const { listingType, listedPrice, minOfferPercent, allowOffers } = opts;
  const onlyPath = offerIsOnlyPurchasePath(listingType);

  if (onlyPath && allowOffers !== true) {
    return { min: listedPrice, max: listedPrice, isBuyRequest: true };
  }

  return {
    min: minOfferAmount(listedPrice, minOfferPercent),
    // `- 0.01` and not `- 1`: money is decimal rupees, and this is the exact
    // ceiling `makeOfferFormSchema` has always enforced.
    max: onlyPath ? listedPrice : Math.round((listedPrice - 0.01) * 100) / 100,
    isBuyRequest: false,
  };
}

/** Whether `amount` falls within `bounds`. The one comparison, shared. */
export function isWithinOfferBounds(amount: number, bounds: OfferBounds): boolean {
  return amount >= bounds.min && amount <= bounds.max;
}
