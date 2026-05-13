/**
 * Live-item listing rule — buyer jurisdiction check + vendor verification.
 *
 * Live animals/plants require a verified seller and that the buyer's delivery
 * state is in the product's `jurisdictionAllowed` list.  Cart eligibility is
 * blocked at the action layer via `capabilityFor("live").requiresJurisdictionCheck`
 * until the full gate (SB-UNI-O) is implemented.
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const liveRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard",
  cartEligible: false, // blocked until SB-UNI-O jurisdiction + vendor-verified gate
};
