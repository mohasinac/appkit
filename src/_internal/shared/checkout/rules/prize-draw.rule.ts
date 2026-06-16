import { ValidationError } from "../../../../errors";
import type { JsonValue } from "@mohasinac/appkit";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type {
  ListingCheckoutRule,
  CartItemProductPair,
  OrderItemInput,
} from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";
import { PRIZE_DRAW_MAX_REVEALS_PER_ORDER } from "./_limits";

export const prizeDrawRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "prize-draw",
  nonRefundable: true,
  maxQuantityPerLine: 1,
  canMergeWithSameProduct: false,
  maxLinesPerOrder: PRIZE_DRAW_MAX_REVEALS_PER_ORDER,
  refundPolicy: { full: false, partial: false, partialGranularity: "none" },

  splitKey: (item: CartItemDocument) => `prize-draw:${item.itemId}`,

  /**
   * Slice a high-quantity prize-draw entry into chunks of
   * PRIZE_DRAW_MAX_REVEALS_PER_ORDER so each resulting order has at most
   * that many reveal slots.  Buying 7 entries → [3, 3, 1].
   */
  splitMultipleOrders: (item: CartItemDocument): CartItemDocument[] => {
    if (item.quantity <= PRIZE_DRAW_MAX_REVEALS_PER_ORDER) return [item];
    const chunks: CartItemDocument[] = [];
    let remaining = item.quantity;
    let batchIndex = 0;
    while (remaining > 0) {
      const batchQty = Math.min(remaining, PRIZE_DRAW_MAX_REVEALS_PER_ORDER);
      chunks.push({
        ...item,
        quantity: batchQty,
        itemId: `${item.itemId}-batch-${batchIndex}`,
      });
      remaining -= batchQty;
      batchIndex++;
    }
    return chunks;
  },

  preflightChecks: (pairs: CartItemProductPair[]): void => {
    for (const { item, product } of pairs) {
      if (product.listingType !== "prize-draw") continue;
      const max = product.prizeMaxEntries ?? 0;
      if (max <= 0) continue;
      const current = product.prizeCurrentEntries ?? 0;
      if (current + item.quantity > max) {
        throw Object.assign(
          new ValidationError(
            `Draw is full for "${product.title}". ${current}/${max} entries already in.`,
          ),
          { code: "PRIZE_POOL_FULL", productId: product.id },
        );
      }
    }
  },

  stockDecrementExtras: (product: ProductDocument, quantity: number): Record<string, JsonValue> => {
    if (product.listingType !== "prize-draw") return {};
    return {
      prizeCurrentEntries: (product.prizeCurrentEntries ?? 0) + quantity,
    };
  },

  decorateOrderItem: (
    line: OrderItemInput,
    product: ProductDocument,
  ): OrderItemInput => ({
    ...line,
    listingType: "prize-draw",
    prizeRevealStatus:
      product.prizeRevealStatus === "open" ? "open" : "pending",
  }),

  decorateOrderDoc: (
    _groupFirstItem: CartItemDocument,
    groupFirstProduct: ProductDocument,
  ): Record<string, JsonValue> => ({
    prizeDrawProductId: groupFirstProduct.id,
    isNonRefundable: true,
  }),
};
