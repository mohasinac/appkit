/**
 * pending-ops
 *
 * Tracks cart and wishlist operations that haven't been synced to the server yet.
 * Written to localStorage so they survive page refreshes.
 * The sync manager replays these and clears them after a successful push.
 */

import { normalizeError } from "../../../errors/normalize";
const APP_ID = () =>
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_ID
    ? process.env.NEXT_PUBLIC_APP_ID
    : "letitrip";

const CART_OPS_KEY = () => `${APP_ID()}_cart_ops`;
const WL_OPS_KEY = () => `${APP_ID()}_wl_ops`;

/** Fired whenever the pending cart/wishlist op queue changes, so a badge
 *  reading server-authoritative counts (authenticated users) can layer the
 *  not-yet-synced local delta on top instead of waiting for the next
 *  useSyncManager interval (up to 30s) to reflect a just-added item. */
export const CART_OPS_CHANGE_EVENT = "appkit/cart/ops-changed";
export const WISHLIST_OPS_CHANGE_EVENT = "appkit/wishlist/ops-changed";

/** Fired whenever an item is successfully added to the cart (server or guest
 *  path), carrying the resulting totals — so any layout chrome (header cart
 *  badge, a UPI-quick-pay widget, etc.) can react to the exact new
 *  itemCount/totalValue without re-fetching, instead of just knowing "the
 *  cart changed" like `CART_OPS_CHANGE_EVENT` (which carries no payload). */
export const CART_UPDATED_EVENT = "appkit/cart/updated";
export interface CartUpdatedEventDetail {
  itemCount: number;
  totalValue: number;
  productTitle?: string;
}

export function dispatchCartUpdated(detail: CartUpdatedEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CartUpdatedEventDetail>(CART_UPDATED_EVENT, { detail }));
}

/**
 * Shared "added to cart" toast copy — every add-to-cart entry point (the
 * server-backed `useAddToCart` hook, and the local-first quick-add actions
 * on listing grids) shows the same item + updated count/total message
 * instead of a bare "Added to cart", so callers only need to format
 * currency, not compose the sentence twice.
 */
export function formatCartAddedMessage(
  detail: CartUpdatedEventDetail,
  formatCurrency: (amount: number) => string,
): string {
  const itemLabel = detail.productTitle ? `"${detail.productTitle}"` : "Item";
  return `${itemLabel} added to cart — ${detail.itemCount} item${detail.itemCount !== 1 ? "s" : ""}, ${formatCurrency(detail.totalValue)} total`;
}

function dispatchCartOpsChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_OPS_CHANGE_EVENT));
}

function dispatchWishlistOpsChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WISHLIST_OPS_CHANGE_EVENT));
}

export type CartOpKind = "add" | "remove";
export type WishlistOpKind = "add" | "remove";

export interface CartOp {
  op: CartOpKind;
  productId: string;
  quantity?: number;
  /** snapshot data to show in UI without hitting the server */
  productTitle?: string;
  productImage?: string;
  price?: number;
  /** Store identifier (storeSlug) — carried into the server cart on sync so
   *  cart lines group by seller correctly for both guest + signed-in flows. */
  storeId?: string;
  /** Denormalised store display name — keeps the group header readable when
   *  the server-side hydration has not yet run. */
  storeName?: string;
  ts: number;
}

export interface WishlistOp {
  op: WishlistOpKind;
  itemId: string;
  type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live";
  title?: string;
  image?: string;
  ts: number;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (_err) {
    void normalizeError(_err);
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  // Quota exceeded or storage blocked. Losing pending ops costs a retry, never data: the cart is canonical in Firestore.
  } catch (_err) {
    void normalizeError(_err);
  }
}

function writeCartOps(items: CartOp[]): void {
  write(CART_OPS_KEY(), items);
  dispatchCartOpsChange();
}

function writeWishlistOps(items: WishlistOp[]): void {
  write(WL_OPS_KEY(), items);
  dispatchWishlistOpsChange();
}

// ---------------------------------------------------------------------------
// Cart ops
// ---------------------------------------------------------------------------

export function getCartOps(): CartOp[] {
  return read<CartOp>(CART_OPS_KEY());
}

export function pushCartOp(op: Omit<CartOp, "ts">): void {
  const ops = read<CartOp>(CART_OPS_KEY());
  // Collapse: if an add followed by a remove for the same productId, cancel both
  if (op.op === "remove") {
    const withoutProduct = ops.filter((o) => o.productId !== op.productId);
    if (withoutProduct.length < ops.length) {
      // There was a pending add — cancelling
      writeCartOps(withoutProduct);
      return;
    }
  }
  // Deduplicate: merge add quantities for the same productId
  if (op.op === "add") {
    const existing = ops.find(
      (o) => o.op === "add" && o.productId === op.productId,
    );
    if (existing) {
      const merged = ops.map((o) =>
        o.op === "add" && o.productId === op.productId
          ? { ...o, quantity: Math.min((o.quantity ?? 1) + (op.quantity ?? 1), 99) }
          : o,
      );
      writeCartOps(merged);
      return;
    }
  }
  writeCartOps([...ops, { ...op, ts: Date.now() }]);
}

export function clearCartOps(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_OPS_KEY());
  dispatchCartOpsChange();
}

/**
 * Drop the queued ops for specific products, after their removal has already
 * been applied server-side.
 *
 * Deliberately NOT `pushCartOp({ op: "remove", … })`. Every call site in the
 * codebase pushes `op: "add"` only, so the queue's `remove` half is dead —
 * and `useSyncManager`'s replay of a remove op calls `BY_ITEM_ID(op.productId)`,
 * handing a productId to a route that looks up by `itemId`. Queueing a remove
 * to express "this is already gone" would activate that latent 404.
 *
 * The op is what makes a cleared row re-appear (the cart page layers the queue
 * over the server response on every render) and what makes `useSyncManager`
 * re-POST it 30s later — so dropping it is the whole point, not bookkeeping.
 */
export function removeCartOpsFor(productIds: readonly string[]): void {
  if (typeof window === "undefined" || productIds.length === 0) return;
  const drop = new Set(productIds);
  const ops = read<CartOp>(CART_OPS_KEY());
  const kept = ops.filter((op) => !drop.has(op.productId));
  if (kept.length === ops.length) return;
  writeCartOps(kept);
}

/** Net quantity of unsynced "add" ops — layered on top of the server's
 *  authoritative itemCount so the header badge updates immediately instead
 *  of waiting for the next useSyncManager interval. Cart never queues
 *  "remove" ops (removal from an authenticated cart is always a synchronous
 *  API call), so summing "add" quantities is exact, not an approximation. */
export function getCartOpsDelta(): number {
  return getCartOps().reduce(
    (sum, op) => (op.op === "add" ? sum + (op.quantity ?? 1) : sum),
    0,
  );
}

// ---------------------------------------------------------------------------
// Wishlist ops
// ---------------------------------------------------------------------------

export function getWishlistOps(): WishlistOp[] {
  return read<WishlistOp>(WL_OPS_KEY());
}

export function pushWishlistOp(op: Omit<WishlistOp, "ts">): void {
  const ops = read<WishlistOp>(WL_OPS_KEY());
  // Cancel add+remove pairs for the same (itemId, type)
  const key = (o: Pick<WishlistOp, "itemId" | "type">) => `${o.itemId}:${o.type}`;
  if (op.op === "remove") {
    const withoutItem = ops.filter((o) => key(o) !== key(op));
    if (withoutItem.length < ops.length) {
      writeWishlistOps(withoutItem);
      return;
    }
  }
  // Deduplicate adds
  if (op.op === "add" && ops.some((o) => o.op === "add" && key(o) === key(op))) {
    return;
  }
  writeWishlistOps([...ops, { ...op, ts: Date.now() }]);
}

/** Net count of unsynced wishlist ops — add/remove pairs for the same item
 *  are already collapsed by `pushWishlistOp`, so this is exact: +1 per
 *  queued "add", -1 per queued "remove" (an item already on the server
 *  being removed before the next sync). */
export function getWishlistOpsDelta(): number {
  return getWishlistOps().reduce(
    (sum, op) => sum + (op.op === "add" ? 1 : -1),
    0,
  );
}

export function clearWishlistOps(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WL_OPS_KEY());
  dispatchWishlistOpsChange();
}
