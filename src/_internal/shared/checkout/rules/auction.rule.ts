import type { ListingCheckoutRule } from "./types";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const auctionRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "auction",
  cartEligible: false, // bid-only; add-to-cart is blocked at the action layer
  cartIneligibleHint: "Place a bid on the auction page instead.",
  /*
   * 🛑 cod + cash, NOT emi. An auction win is a committed sale of a unique lot:
   * a buyer who never pays on delivery costs the seller the item and the
   * auction both, and there is no second-highest bidder to fall back to once
   * it has been marked sold. EMI is confirmed-at-order financing rather than a
   * deferred payment, so it carries none of that risk and stays available.
   */
  blockedPaymentMethods: ["cod", "cash"],
  blockedPaymentMessage:
    "An auction win cannot be paid for on delivery or in cash — the lot is one of a kind and is held for you from the moment the auction closes.",
  canMergeWithSameProduct: false,
  refundPolicy: { full: true, partial: false, partialGranularity: "none" },
  splitKey: (item: CartItemDocument) => `auction:${item.itemId}`,
};
