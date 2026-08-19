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
import type { CheckoutPaymentMethod } from "../../features/checkout/config";

/**
 * Deferred/unconfirmed-payment methods are not allowed for prize-draw
 * checkout — instant-mode winner assignment triggers on the order's payment
 * actually being confirmed, which cod/cash/emi don't guarantee happens (or
 * happens promptly). Only "upi_manual" (bank/UPI transfer, confirmed later by
 * seller/admin) and "online" (Razorpay, confirms near-instantly) are allowed;
 * "admin_bypass" stays usable for QA regardless.
 */
const PRIZE_DRAW_BLOCKED_PAYMENT_METHODS: CheckoutPaymentMethod[] = ["cod", "cash", "emi"];

export const prizeDrawRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "prize-draw",
  nonRefundable: true,
  maxQuantityPerLine: 1,
  canMergeWithSameProduct: false,
  maxLinesPerOrder: PRIZE_DRAW_MAX_REVEALS_PER_ORDER,
  refundPolicy: { full: false, partial: false, partialGranularity: "none" },
  blockedPaymentMethods: PRIZE_DRAW_BLOCKED_PAYMENT_METHODS,

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

  preflightChecks: (pairs: CartItemProductPair[], paymentMethod?: CheckoutPaymentMethod): void => {
    if (paymentMethod && PRIZE_DRAW_BLOCKED_PAYMENT_METHODS.includes(paymentMethod)) {
      const hasPrizeDraw = pairs.some((p) => p.product.listingType === "prize-draw");
      if (hasPrizeDraw) {
        throw Object.assign(
          new ValidationError(
            "Prize-draw entries can only be paid by manual bank/UPI transfer or Razorpay — cash on delivery and EMI are not available for this listing type.",
          ),
          { code: "PRIZE_DRAW_PAYMENT_METHOD_BLOCKED" },
        );
      }
    }
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

  stockIncrementExtras: (product: ProductDocument, quantity: number): Record<string, JsonValue> => {
    if (product.listingType !== "prize-draw") return {};
    return {
      prizeCurrentEntries: Math.max(0, (product.prizeCurrentEntries ?? 0) - quantity),
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
    ...(groupFirstProduct.prizeRevealMode
      ? { prizeRevealMode: groupFirstProduct.prizeRevealMode }
      : {}),
  }),
};
