import { ValidationError } from "../../../../errors";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ListingCheckoutRule, CartItemProductPair } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const preOrderRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "preorder",

  splitKey: (item: CartItemDocument) =>
    `preorder:${item.storeId ?? "unknown"}`,

  preflightChecks: (pairs: CartItemProductPair[]): void => {
    for (const { item, product } of pairs) {
      if (product.listingType !== "pre-order") continue;
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

  stockDecrementExtras: (product: ProductDocument, quantity: number) => {
    if (product.listingType !== "pre-order") return {};
    return {
      preOrderCurrentCount: (product.preOrderCurrentCount ?? 0) + quantity,
    };
  },
};
