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
import { getCartLineMembers } from "../../../shared/checkout/line-members";

// Re-exported here so the many existing importers of this module keep working;
// the definitions live in shared/ because `rules/_registry.ts` and
// `order-math.ts` need them too and cannot import from server/.
export {
  getCartLineMembers,
  getCartItemMemberIds,
  isMultiMemberLine,
  type CartLineMemberRef,
} from "../../../shared/checkout/line-members";

export interface BundleExpansion {
  /** Unique product ids referenced by any cart item (regular or bundle member). */
  productIds: string[];
  /**
   * Sum of requested quantities per product id, weighted by BOTH the number of
   * copies of the line and each member's per-copy quantity — so 2 copies of a
   * selection containing 3× member X decrement X by 6.
   */
  decrements: Map<string, number>;
}

/** Build the unique-product-id + per-product decrement map for a cart. */
export function getExpandedDecrements(
  cartItems: CartItemDocument[],
): BundleExpansion {
  const decrements = new Map<string, number>();
  for (const item of cartItems) {
    for (const member of getCartLineMembers(item)) {
      // item.quantity = copies of the line, member.quantity = units per copy.
      // Multiplying is the whole point: this used to add `item.quantity` alone,
      // which silently assumed exactly one of each member.
      const needed = item.quantity * member.quantity;
      decrements.set(member.productId, (decrements.get(member.productId) ?? 0) + needed);
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
  for (const member of getCartLineMembers(item)) {
    const product = productById.get(member.productId);
    if (!product || product.status !== ProductStatusValues.PUBLISHED) {
      return { productId: member.productId, availableQty: product?.availableQuantity ?? 0 };
    }
    // The fallback must be member-weighted too. Left as a bare `item.quantity`
    // it would validate a line needing 3× of a member against demand for 1
    // whenever the cumulative map didn't happen to carry that product.
    const totalNeeded = decrements.get(member.productId) ?? item.quantity * member.quantity;
    if (product.availableQuantity < totalNeeded) {
      return { productId: member.productId, availableQty: product.availableQuantity };
    }
  }
  return null;
}

/**
 * Result of bucketing a cart into stock-satisfiable vs. stock-short lines.
 * Shared shape consumed by both checkout entry points (COD/UPI transaction
 * path and Razorpay post-payment path) so "what happens when an item is
 * unavailable" (skip it vs. cancel the whole checkout) is decided ONCE, by
 * the caller, from the same bucketing logic.
 */
export interface StockBucketResult {
  available: { item: CartItemDocument; product: ProductDocument }[];
  unavailable: {
    productId: string;
    productTitle: string;
    requestedQty: number;
    availableQty: number;
  }[];
}

/**
 * For every cart item: bucket into `available` (with its resolved
 * "representative" product attached) or `unavailable` (with the shortfall
 * detail). Pure stock bucketing only — callers are responsible for any
 * extra per-item side effects (sync preflight checks, business-rule caps,
 * etc.) they want to run over the `available` bucket.
 *
 * `resolveRepresentative` lets each call site supply its own "which product
 * represents this cart line" logic (both current call sites use the first
 * bundle member / the plain productId) without duplicating that lookup here.
 */
export function bucketCartItemsByStock(
  cartItems: CartItemDocument[],
  productById: Map<string, ProductDocument>,
  decrements: Map<string, number>,
  resolveRepresentative: (item: CartItemDocument) => ProductDocument | null,
): StockBucketResult {
  const available: StockBucketResult["available"] = [];
  const unavailable: StockBucketResult["unavailable"] = [];

  for (const item of cartItems) {
    const shortfall = validateCartItemStock(item, productById, decrements);
    if (shortfall) {
      unavailable.push({
        productId: shortfall.productId,
        productTitle: item.productTitle,
        requestedQty: item.quantity,
        availableQty: shortfall.availableQty,
      });
      continue;
    }
    const representative = resolveRepresentative(item);
    if (!representative) {
      // Defensive — validateCartItemStock already confirmed every member
      // product exists + is published, so this should be unreachable.
      unavailable.push({
        productId: item.productId,
        productTitle: item.productTitle,
        requestedQty: item.quantity,
        availableQty: 0,
      });
      continue;
    }
    available.push({ item, product: representative });
  }

  return { available, unavailable };
}
