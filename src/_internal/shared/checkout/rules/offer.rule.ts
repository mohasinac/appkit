/**
 * Offer rule — synthetic, keyed off CartItemDocument.isOffer (not listingType).
 *
 * An accepted Make-an-Offer locks a single item at the negotiated price for
 * one buyer. Orders are never merged; every offer line is its own order.
 */
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const offerRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "offer",
  maxQuantityPerLine: 1,
  canMergeWithSameProduct: false,
  refundPolicy: { full: true, partial: false, partialGranularity: "none" },
  splitKey: (item: CartItemDocument) => `offer:${item.itemId}`,
};
