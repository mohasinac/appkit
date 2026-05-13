/**
 * Bundle cart-item expansion helpers — S-SBUNI-5 2026-05-13.
 *
 * Checkout treats each cart item as one OrderItem row (bundles stay grouped
 * in the order) but stock decrement has to fan out to the bundle's member
 * products. These helpers do that fan-out without breaking the existing
 * per-cart-item validation loops.
 *
 * Two-step model:
 *  1. `getExpandedDecrements(cartItems)` — returns the unique product-id set
 *     to fetch + a per-product total-quantity map. Multiple cart items that
 *     touch the same product (e.g. two bundles sharing one member, or a
 *     bundle + a regular item) get summed.
 *  2. `validateCartItemStock(item, productById)` — for one cart item, looks
 *     up every required product (bundle members OR the single productId) +
 *     returns the worst-case shortfall: `null` if all OK, or the first
 *     unavailable member's id + availableQty.
 *
 * Note: validation in-tx is still subject to product writes from a parallel
 * checkout — the Firestore transaction guarantees the second checkout sees
 * the first's decrement before re-running its own validation.
 */

import type { CartItemDocument } from "../../../../features/cart/schemas";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { ProductStatusValues } from "../../../../features/products/schemas/firestore";

export interface BundleExpansion {
  /** Unique product ids referenced by any cart item (regular or bundle member). */
  productIds: string[];
  /**
   * Sum of requested quantities per product id. Bundle members get
   * `item.quantity` per occurrence (so 2x of a bundle with member X
   * decrements X by 2, not 1).
   */
  decrements: Map<string, number>;
}

/** Resolve the member-product ids for a cart item. Bundle items expand to
 *  `bundleProductIds[]`; regular items collapse to `[productId]`. */
export function getCartItemMemberIds(item: CartItemDocument): string[] {
  if (item.bundleProductIds && item.bundleProductIds.length > 0) {
    return item.bundleProductIds;
  }
  return [item.productId];
}

/** Build the unique-product-id + per-product decrement map for a cart. */
export function getExpandedDecrements(
  cartItems: CartItemDocument[],
): BundleExpansion {
  const decrements = new Map<string, number>();
  for (const item of cartItems) {
    const memberIds = getCartItemMemberIds(item);
    for (const pid of memberIds) {
      decrements.set(pid, (decrements.get(pid) ?? 0) + item.quantity);
    }
  }
  return {
    productIds: [...decrements.keys()],
    decrements,
  };
}

export interface StockShortfall {
  /** The member product id that ran out (or never existed). */
  productId: string;
  /** Quantity Firestore still has for that product. */
  availableQty: number;
}

/**
 * For a single cart item: returns `null` when every required product is
 * published + has enough stock, or the first shortfall encountered. The
 * caller supplies a `productById` lookup populated from the in-tx fetch
 * (so the same query runs once for the whole cart).
 *
 * `decrements` lets the caller account for OTHER cart items touching the
 * same product — pass the cumulative map from `getExpandedDecrements` so
 * the available quantity is compared against the WHOLE cart's demand for
 * that product, not just this item's slice.
 */
export function validateCartItemStock(
  item: CartItemDocument,
  productById: Map<string, ProductDocument>,
  decrements: Map<string, number>,
): StockShortfall | null {
  const memberIds = getCartItemMemberIds(item);
  for (const pid of memberIds) {
    const product = productById.get(pid);
    if (!product || product.status !== ProductStatusValues.PUBLISHED) {
      return { productId: pid, availableQty: product?.availableQuantity ?? 0 };
    }
    const totalNeeded = decrements.get(pid) ?? item.quantity;
    if (product.availableQuantity < totalNeeded) {
      return { productId: pid, availableQty: product.availableQuantity };
    }
  }
  return null;
}
