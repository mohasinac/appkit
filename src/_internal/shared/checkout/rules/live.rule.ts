/**
 * Live-item listing rule — buyer jurisdiction check + vendor verification.
 *
 * SB-UNI-O 2026-05-15: cart is now open; jurisdiction + vendor-verified checks
 * run at checkout preflight (see checkout/actions.ts claimLiveItemPreflight).
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const liveRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard",
  cartEligible: true,
};
