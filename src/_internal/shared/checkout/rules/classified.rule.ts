/**
 * Classified listing rule — chat-only, no checkout.
 *
 * Classified listings (OLX / Facebook Marketplace pattern) surface a
 * "Contact Seller" CTA that opens a conversations thread.  No cart, no
 * payment, no order. SB-UNI-M will wire the full flow.
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const classifiedRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard", // placeholder — classified never reaches order creation
  purchaseable: false,
  cartEligible: false,
  requiresShippingAddress: false,
  requiresConsentOtp: false,
};
