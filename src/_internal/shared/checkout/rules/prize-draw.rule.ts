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
 * seller/admin) and "online" (PhonePe, confirms near-instantly) are allowed;
 * "admin_bypass" stays usable for QA regardless.
 */
const PRIZE_DRAW_BLOCKED_PAYMENT_METHODS: CheckoutPaymentMethod[] = ["cod", "cash", "emi"];

/**
 * The refusal, kept VERBATIM when this check moved out of `preflightChecks`
 * into `assertPaymentMethodAllowed`.
 *
 * 🛑 The gate can generate a correct sentence on its own, and a generated one
 * would have been a regression here: this wording names the REASON (winner
 * assignment waits on confirmed payment) rather than just the refusal, and the
 * reason is the thing a buyer needs in order to pick a different method rather
 * than abandon the entry.
 */
const PRIZE_DRAW_BLOCKED_PAYMENT_MESSAGE =
  "Prize-draw entries can only be paid by manual bank/UPI transfer or PhonePe — cash on delivery and EMI are not available for this listing type.";

export const prizeDrawRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "prize-draw",
  nonRefundable: true,
  canMergeWithSameProduct: false,
  maxLinesPerOrder: PRIZE_DRAW_MAX_REVEALS_PER_ORDER,
  refundPolicy: { full: false, partial: false, partialGranularity: "none" },
  blockedPaymentMethods: PRIZE_DRAW_BLOCKED_PAYMENT_METHODS,
  blockedPaymentMessage: PRIZE_DRAW_BLOCKED_PAYMENT_MESSAGE,

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
    /*
     * The payment-method check USED to live here and is now in
     * `assertPaymentMethodAllowed`, which runs cart-wide before the
     * transaction.
     *
     * 🛑 This is not a tidy-up. The copy here could only ever see
     * single-member lines — `runSyncPreflight` skips a bundle or grouped line,
     * and its online call site reduces each line to its FIRST member — so a
     * prize-draw entry reachable through a grouped selection was never
     * checked. Re-adding a copy here would be a second answer to one question
     * (Root Cause #75), and the one that is easier to find is the one that
     * cannot see every line.
     *
     * `blockedPaymentMethods` + `blockedPaymentMessage` on this rule are what
     * the gate reads, so the wording is unchanged.
     */
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
