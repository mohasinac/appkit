/**
 * Digital-code listing rule — no shipping, instant fulfilment.
 *
 * Codes are delivered electronically at purchase confirmation. No shipping
 * address required. SB-UNI-N wires the full code-pool claim + reveal flow.
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const digitalCodeRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard", // single-line standard order; fulfilment differs
  requiresShippingAddress: false,
};
