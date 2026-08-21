/**
 * Pure checkout line-item math shared between the checkout server actions
 * and its test suite. No framework or Firestore imports — safe to unit test
 * directly, unlike `checkout/actions.ts` whose module graph pulls in
 * `server-only` guards that fail outside a real server-action test harness.
 */
import type { CartItemDocument } from "../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../features/products/schemas/firestore";
import { roundRupees } from "../../../utils/number.formatter";

/**
 * The single source of truth for "what do we charge for this line".
 *
 * Three cases, in priority order:
 *
 *  1. **A locked price** — an accepted offer or a won auction. `lockedPrice` is
 *     the negotiated/won amount and it OVERRIDES the current listing price, which
 *     is the whole point of the negotiation. Until 2026-08-21 none of the five
 *     copies of this function looked at `lockedPrice`, so an accepted offer was
 *     billed at the seller's listed price while the cart UI displayed the agreed
 *     one (`item.lockedPrice ?? item.price`) — the buyer saw ₹X and paid ₹Y.
 *  2. **A bundle line** (SB-UNI-5 2026-05-13) — `item.price` is the bundle price
 *     locked at add-time.
 *  3. **Everything else** — the live Firestore price, so a stale cart-cached
 *     price is never charged on a COD/UPI order.
 *
 * `product` may be null for a locked line whose listing has since been archived;
 * the locked price is still owed, so that case must not dereference `product`.
 */
export function unitPriceFor(item: CartItemDocument, product: ProductDocument | null): number {
  if (typeof item.lockedPrice === "number" && item.lockedPrice > 0) {
    return item.lockedPrice;
  }
  if (item.bundleCategorySlug && item.bundleProductIds?.length) {
    return item.price;
  }
  // Null-safe fallback: one of the four call sites this replaced (the cart
  // summary/preview path) already guarded with `product?.price ?? item.price`,
  // and collapsing onto a non-null assertion would have regressed it into a
  // crash whenever a cart line outlives its listing.
  return product?.price ?? item.price;
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
    return sum + lineTotal * (pct / 100); // audit-money-units-ok: percentage divisor, not paise
  }, 0);
  return roundRupees(raw);
}
