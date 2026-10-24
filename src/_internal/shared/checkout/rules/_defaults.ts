/** Default ListingCheckoutRule hook implementations. */

import type {
  ListingCheckoutRule,
  CartItemProductPair,
  OrderItemInput,
} from "./types";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { CheckoutPaymentMethod } from "../../features/checkout/config";

export const DEFAULT_LISTING_RULE: Omit<ListingCheckoutRule, "orderType"> = {
  purchaseable: true,
  cartEligible: true,
  cartIneligibleHint: "This listing type cannot be added to the cart.",
  requiresShippingAddress: true,
  nonRefundable: false,
  canMergeWithSameProduct: true,
  maxLinesPerOrder: Infinity,
  refundPolicy: { full: true, partial: true, partialGranularity: "item" },

  splitKey: (item: CartItemDocument) =>
    `standard:${item.storeId ?? "unknown"}`,

  splitMultipleOrders: (item: CartItemDocument) => [item],

  preflightChecks: (_pairs: CartItemProductPair[], _paymentMethod?: CheckoutPaymentMethod) => { /* no-op */ },

  stockDecrementExtras: (_product: ProductDocument, _qty: number) => ({}),

  stockIncrementExtras: (_product: ProductDocument, _qty: number) => ({}),

  decorateOrderItem: (line: OrderItemInput, product: ProductDocument): OrderItemInput => ({
    ...line,
    ...(product.listingType ? { listingType: product.listingType } : {}),
  }),

  decorateOrderDoc: (
    _groupFirstItem: CartItemDocument,
    _groupFirstProduct: ProductDocument,
  ) => ({}),
};
