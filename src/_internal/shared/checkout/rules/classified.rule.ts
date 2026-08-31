/**
 * Classified listing rule — no cart, no checkout; the offer IS the purchase path.
 *
 * Classified listings (OLX / Facebook Marketplace pattern) never reach cart or
 * order creation. The buyer transacts through Make-an-Offer: the seller accepts,
 * which produces a locked cart line in the offer lane, and checkout proceeds
 * from there like any other accepted offer.
 *
 * A seller who has not set `allowOffers` still receives requests to buy at their
 * asking price — see `resolveOfferBounds` in the offers config. Without that,
 * unchecking one flag would make the listing untransactable.
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const classifiedRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard", // placeholder — a classified reaches order creation only via an accepted offer
  purchaseable: false,
  cartEligible: false,
  /*
   * Names the control the page actually has. It read 'Use "Contact Seller" to
   * arrange a meetup' until 2026-08-31, and that button opened a conversations
   * thread which no longer exists.
   */
  cartIneligibleHint: "Make an offer to buy this — classified listings are arranged with the seller.",
  requiresShippingAddress: false,
};
