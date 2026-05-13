import type { ListingCheckoutRule } from "./types";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const auctionRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "auction",
  cartEligible: false, // bid-only; add-to-cart is blocked at the action layer
  maxQuantityPerLine: 1,
  canMergeWithSameProduct: false,
  refundPolicy: { full: true, partial: false, partialGranularity: "none" },
  splitKey: (item: CartItemDocument) => `auction:${item.itemId}`,
};
