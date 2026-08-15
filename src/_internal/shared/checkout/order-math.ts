/**
 * Pure checkout line-item math shared between the checkout server actions
 * and its test suite. No framework or Firestore imports — safe to unit test
 * directly, unlike `checkout/actions.ts` whose module graph pulls in
 * `server-only` guards that fail outside a real server-action test harness.
 */
import type { CartItemDocument } from "../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../features/products/schemas/firestore";

// SB-UNI-5 2026-05-13 — bundle cart-lines use item.price (locked bundle price
// at add-time); regular lines use product.price (current Firestore). Prevents
// stale cart-cached prices from being charged on COD/UPI orders.
export function unitPriceFor(item: CartItemDocument, product: ProductDocument | null): number {
  return item.bundleCategorySlug && item.bundleProductIds?.length
    ? item.price
    : (product as ProductDocument).price;
}

/**
 * P-6 — pre-order groups charge each product's own `preOrderDepositPercent`
 * (falling back to the generic COD deposit % when a product doesn't have one
 * configured), summed per line. A single seller group can mix multiple
 * pre-order products with different configured deposit percentages, so this
 * cannot be a single group-level percentage the way the generic COD deposit
 * calculation is.
 */
export function computePreOrderDepositAmount(
  group: Array<{ item: CartItemDocument; product: ProductDocument }>,
  defaultDepositPercent: number,
): number {
  const raw = group.reduce((sum, { item, product }) => {
    const lineTotal = unitPriceFor(item, product) * item.quantity;
    const pct = product.preOrderDepositPercent ?? defaultDepositPercent;
    return sum + lineTotal * (pct / 100);
  }, 0);
  return Math.round(raw * 100) / 100;
}
