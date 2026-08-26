/**
 * "What products does this cart line actually consume?" — the one answer.
 *
 * Lives in `shared/` rather than `server/features/checkout/` because three
 * different layers need it and two of them are not server code:
 *   - `order-math.ts`         (pricing + tax, shared)
 *   - `rules/_registry.ts`    (preflight skip, shared)
 *   - `bundle-expansion.ts`   (stock fan-out, server)
 *   - `stock-restore.ts`      (restore fan-out, server)
 *
 * Pure functions, no Firestore, no framework imports.
 */

import type { CartItemDocument } from "../../../features/cart/schemas/firestore";

/** One member of a cart line, with the units required per COPY of that line. */
export interface CartLineMemberRef {
  productId: string;
  quantity: number;
}

/**
 * Resolve a line's members. Three sources, in priority order — never read
 * `bundleProductIds` directly at a call site:
 *
 *  1. `groupMembers` — authoritative, and the only shape that can express
 *     per-member quantities.
 *  2. `bundleProductIds` — legacy bundle lines written before `groupMembers`
 *     existed, resolved at quantity 1 each. This fallback is what makes carts
 *     that were already in flight behave byte-identically, with no migration.
 *  3. the line's own `productId` — an ordinary single-product line.
 *
 * Keeping this a derivation rather than storing a second array is deliberate: a
 * hand-maintained mirror drifts the first time one write path forgets it
 * (Recurrent Root Cause #42).
 */
export function getCartLineMembers(item: CartItemDocument): CartLineMemberRef[] {
  if (item.groupMembers?.length) {
    return item.groupMembers.map((m) => ({
      productId: m.productId,
      quantity: m.quantity,
    }));
  }
  if (item.bundleProductIds?.length) {
    return item.bundleProductIds.map((productId) => ({ productId, quantity: 1 }));
  }
  return [{ productId: item.productId, quantity: 1 }];
}

/**
 * True when the line stands for several products rather than one.
 *
 * Replaces the scattered `item.bundleProductIds?.length` tests, which each
 * meant "is this a bundle" and would all have silently answered "no" for a
 * `groupMembers`-backed line.
 */
export function isMultiMemberLine(item: CartItemDocument): boolean {
  return Boolean(item.groupMembers?.length || item.bundleProductIds?.length);
}

/** Just the product ids — see `getCartLineMembers` for the resolution order. */
export function getCartItemMemberIds(item: CartItemDocument): string[] {
  return getCartLineMembers(item).map((m) => m.productId);
}

/** The order-side shape this module needs. Structural on purpose — it matches
 *  `OrderDocumentItem` without dragging the orders schema into shared checkout. */
export interface OrderItemMemberSource {
  productId: string;
  bundleProductIds?: string[];
}

/**
 * The order-side twin of `getCartLineMembers`, used by stock restore.
 *
 * A LEGACY order row is collapsed: one row standing for a whole bundle, with
 * its members listed in `bundleProductIds` at one unit each. Rows written after
 * grouped lines were expanded carry no `bundleProductIds` at all — each row is
 * already exactly one product — so they fall through to the single-member
 * branch and need no special case.
 */
export function getOrderItemMemberRefs(item: OrderItemMemberSource): CartLineMemberRef[] {
  if (item.bundleProductIds?.length) {
    return item.bundleProductIds.map((productId) => ({ productId, quantity: 1 }));
  }
  return [{ productId: item.productId, quantity: 1 }];
}
