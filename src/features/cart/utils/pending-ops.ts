/**
 * pending-ops
 *
 * Tracks cart and wishlist operations that haven't been synced to the server yet.
 * Written to localStorage so they survive page refreshes.
 * The sync manager replays these and clears them after a successful push.
 */

const APP_ID = () =>
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_ID
    ? process.env.NEXT_PUBLIC_APP_ID
    : "letitrip";

const CART_OPS_KEY = () => `${APP_ID()}_cart_ops`;
const WL_OPS_KEY = () => `${APP_ID()}_wl_ops`;

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
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // storage quota exceeded — best effort
  }
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
      write(CART_OPS_KEY(), withoutProduct);
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
      write(CART_OPS_KEY(), merged);
      return;
    }
  }
  write(CART_OPS_KEY(), [...ops, { ...op, ts: Date.now() }]);
}

export function clearCartOps(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_OPS_KEY());
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
      write(WL_OPS_KEY(), withoutItem);
      return;
    }
  }
  // Deduplicate adds
  if (op.op === "add" && ops.some((o) => o.op === "add" && key(o) === key(op))) {
    return;
  }
  write(WL_OPS_KEY(), [...ops, { ...op, ts: Date.now() }]);
}

export function clearWishlistOps(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WL_OPS_KEY());
}
