import { ValidationError } from "../../../../errors";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { JsonValue } from "../../../../schemas/types";
import type { ListingCheckoutRule, CartItemProductPair } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";
import {
  checkPreOrderDeliveryDate,
  preOrderDeliveryBuyerMessage,
} from "../../../../features/products/constants/preorder-window";

export const preOrderRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "preorder",

  splitKey: (item: CartItemDocument) =>
    `preorder:${item.storeId ?? "unknown"}`,

  /*
   * 🛑 TWO checks, and only the quota one existed.
   *
   * The delivery-date half is the buy-side of the 45-day rule. Without it a
   * buyer could pay for a pre-order whose promised date had ALREADY PASSED —
   * the money is taken, `preorder-deliver` fires on the next 5-minute sweep,
   * and the order is cancelled and refunded. A refusal before payment is the
   * same outcome with none of the gateway round-trip, and it is the honest one.
   *
   * It also refuses a date beyond the window, which is not merely defensive:
   * the seeded catalogue carries +90 and +120 day pre-orders written before
   * the write-side cap existed, and Cashfree Easy Split cannot hold a
   * settlement past 45 days — so those orders have nowhere lawful to settle
   * to. Taking the money first and discovering that afterwards is the failure
   * mode; the write-side cap stops NEW ones, this stops the existing ones.
   *
   * `now` is read ONCE per preflight rather than per pair, so a multi-item
   * cart cannot have two lines judged against two different instants.
   */
  preflightChecks: (pairs: CartItemProductPair[]): void => {
    const now = new Date();
    for (const { item, product } of pairs) {
      if (product.listingType !== "pre-order") continue;

      const verdict = checkPreOrderDeliveryDate(product.preOrderDeliveryDate, now);
      /*
       * `absent` passes. A pre-order with no stored date predates the field
       * being required and is governed by its quota alone — refusing it here
       * would make existing listings unbuyable for a reason the buyer cannot
       * act on, which is the seller's problem to fix on the write side.
       * `unparseable` passes for the same reason: a corrupt stored value is an
       * operations fault, not something to charge a buyer for discovering.
       */
      if (verdict === "past" || verdict === "beyond-window") {
        throw Object.assign(
          new ValidationError(
            `"${product.title}" cannot be pre-ordered right now. ` +
              (preOrderDeliveryBuyerMessage(verdict) ?? ""),
          ),
          {
            code:
              verdict === "past"
                ? "PREORDER_DELIVERY_DATE_PASSED"
                : "PREORDER_DELIVERY_DATE_BEYOND_WINDOW",
            productId: product.id,
          },
        );
      }

      const cap = product.preOrderMaxQuantity ?? 0;
      if (cap <= 0) continue;
      const current = product.preOrderCurrentCount ?? 0;
      if (current + item.quantity > cap) {
        throw Object.assign(
          new ValidationError(
            `Pre-order quota reached for "${product.title}". ` +
              `${current}/${cap} already reserved.`,
          ),
          { code: "PREORDER_QUOTA_FULL", productId: product.id },
        );
      }
    }
  },

  stockDecrementExtras: (product: ProductDocument, quantity: number): Record<string, JsonValue> => {
    if (product.listingType !== "pre-order") return {};
    return {
      preOrderCurrentCount: (product.preOrderCurrentCount ?? 0) + quantity,
    };
  },

  stockIncrementExtras: (product: ProductDocument, quantity: number): Record<string, JsonValue> => {
    if (product.listingType !== "pre-order") return {};
    return {
      preOrderCurrentCount: Math.max(0, (product.preOrderCurrentCount ?? 0) - quantity),
    };
  },
};
