/**
 * Checkout rule interfaces — S-SBUNI-RULES 2026-05-13.
 *
 * Two registries:
 *   - CHECKOUT_RULES  keyed by ListingType  (for cart-based products)
 *   - CATEGORY_CHECKOUT_RULES  keyed by CategoryType  (for direct-checkout
 *     categories like bundles)
 *
 * Every hook has a default in _defaults.ts so rule files only override what
 * differs from the baseline. This is the seam that makes Phase 2+ listing
 * types zero-consumer-edit additions.
 */

import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { JsonValue } from "@mohasinac/appkit";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { OrderDocumentItem } from "../../../../features/orders/schemas/firestore";
import type { OrderType } from "../../../../features/orders/utils/order-splitter";
import type { CheckoutPaymentMethod } from "../../features/checkout/config";

export interface CartItemProductPair {
  item: CartItemDocument;
  product: ProductDocument;
}

/** Minimal shape for an order-line created by the checkout action pipeline. */
export interface OrderItemInput extends Omit<OrderDocumentItem, "bundleCategorySlug" | "bundleProductIds"> {
  bundleCategorySlug?: string;
  bundleProductIds?: string[];
}

export interface RefundPolicy {
  full: boolean;
  partial: boolean;
  /** Granularity of partial refunds when `partial: true`. */
  partialGranularity: "item" | "amount" | "none";
}

/**
 * Checkout rule for a ListingType.  Every field has a default; rule files only
 * override what differs from the baseline.
 */
export interface ListingCheckoutRule {
  /** Can this listing type be purchased at all? */
  purchaseable: boolean;
  /**
   * Can this item sit in the shopping cart?  False for auctions (bid-only),
   * classified (chat-only), live (pending jurisdiction gate), bundles
   * (direct-checkout-only via CategoryCheckoutRule).
   */
  cartEligible: boolean;
  /**
   * Buyer-facing hint appended to the "cannot add to cart" error when
   * `cartEligible` is false — tells them what to do instead (place a bid,
   * contact seller, etc). Ignored when `cartEligible` is true.
   */
  cartIneligibleHint: string;
  /** OrderType assigned to orders created from this listing type. */
  orderType: OrderType;
  /**
   * Does checkout require a shipping address? False for digital-code (electronic
   * delivery) and classified (meetup-arranged locally).
   */
  requiresShippingAddress: boolean;
  /**
   * Is this order non-refundable? Blocks the refund API for orders of this type.
   * Set true for prize-draw entries.
   */
  nonRefundable: boolean;
  /** Hard qty cap per single cart line. Auction/offer/prize-draw-per-line = 1. */
  maxQuantityPerLine: number;
  /**
   * When false the checkout pipeline issues one order per cart line (even when
   * multiple lines share the same product).  Auctions and offers set this to
   * false so each lock is its own order.
   */
  canMergeWithSameProduct: boolean;
  /**
   * Maximum reveal-entries per order. Prize-draw sets this to
   * PRIZE_DRAW_MAX_REVEALS_PER_ORDER (3) — an entry qty of 7 becomes [3,3,1].
   * Infinity for all other types.
   */
  maxLinesPerOrder: number;
  /** Full/partial refund capabilities per type. */
  refundPolicy: RefundPolicy;
  /**
   * Payment methods this listing type cannot be paid with. Undefined/empty =
   * all methods allowed. Prize-draw blocks cod/cash/emi — winner assignment
   * depends on the order's payment actually being confirmed, which those
   * deferred-payment methods don't guarantee.
   */
  blockedPaymentMethods?: CheckoutPaymentMethod[];

  /**
   * Return the grouping key used by the order splitter. Items with the same
   * key land in the same OrderGroup and produce one order document.
   */
  splitKey(item: CartItemDocument): string;

  /**
   * Slice a single cart item into N virtual items when qty > maxLinesPerOrder.
   * Returns [item] for most types.  Prize-draw overrides to chunk the quantity
   * into batches of PRIZE_DRAW_MAX_REVEALS_PER_ORDER.
   */
  splitMultipleOrders(item: CartItemDocument): CartItemDocument[];

  /**
   * Synchronous preflight guard — runs before any state is mutated.
   * Throws ValidationError on violation; returns void on pass.
   * Receives only data already in memory (no IO needed).
   *
   * Pre-order checks reservationCap. Prize-draw checks prizeMaxEntries +
   * blockedPaymentMethods. Future `live` checks jurisdiction from product +
   * buyer state.
   *
   * `paymentMethod` is optional so existing rules that don't need it (every
   * type except prize-draw today) don't have to accept/ignore the param.
   */
  preflightChecks(pairs: CartItemProductPair[], paymentMethod?: CheckoutPaymentMethod): void;

  /**
   * Return extra Firestore field updates to merge alongside the standard
   * `availableQuantity` decrement. Pure — works from product data already
   * fetched by the calling action.
   *
   * Prize-draw bumps `prizeCurrentEntries`. Pre-order bumps `preOrderCurrentCount`.
   */
  stockDecrementExtras(product: ProductDocument, quantity: number): Record<string, JsonValue>;

  /**
   * Return extra Firestore field updates to merge alongside the standard
   * `availableQuantity` restore, when an order's payment window expires (or
   * its proof is rejected as fraudulent) and its stock must be returned to
   * the public pool. The symmetric inverse of `stockDecrementExtras` — NOT
   * simply the same extras with a negated quantity, since decrement extras
   * bump a counter UP as stock goes down (e.g. `prizeCurrentEntries`), so
   * the restore side must bump that same counter back DOWN. Pure — works
   * from product data already fetched by the calling job/action.
   */
  stockIncrementExtras(product: ProductDocument, quantity: number): Record<string, JsonValue>;

  /**
   * Transform a raw order-line input (built from cart item data) before it
   * is written to the OrderDocument.  Adds type-specific fields such as
   * prize-draw reveal status.
   */
  decorateOrderItem(line: OrderItemInput, product: ProductDocument): OrderItemInput;

  /**
   * Return extra fields to spread onto the created OrderDocument.
   * Used for prize-draw-specific fields (prizeDrawProductId, isNonRefundable,
   * prizeRevealMode).
   */
  decorateOrderDoc(
    groupFirstItem: CartItemDocument,
    groupFirstProduct: ProductDocument,
  ): Record<string, JsonValue>;
}

/**
 * Checkout rule for a purchaseable CategoryType (currently only "bundle").
 * Bundles are always direct-checkout — they never enter the cart.
 */
export interface CategoryCheckoutRule {
  purchaseable: boolean;
  cartEligible: boolean;
  orderType: OrderType;
  requiresShippingAddress: boolean;
}
