/**
 * Coupon Stacking Rules
 *
 * A cart may hold at most one seller-scoped coupon per store, plus at most
 * one admin (platform-wide) coupon on top. Both scopes stack with each
 * other freely — the old `combineWithSellerCoupons` opt-out was removed
 * (2026-08-21): stacking is now unconditional as long as the two "buckets"
 * (per-store, and the single platform-wide slot) don't collide.
 *
 * Pure function, no I/O — safe to call from both the cart-apply route and
 * the checkout re-validation pass.
 */
import type { CartAppliedCoupon } from "../../cart/schemas/firestore";

export interface IncomingCoupon {
  code: string;
  scope: "admin" | "seller";
  storeId?: string;
}

/**
 * Returns a human-readable conflict message, or null when `incoming` can be
 * added alongside `existing` without violating the one-per-store +
 * one-global rule.
 */
export function detectCouponConflict(
  existing: CartAppliedCoupon[],
  incoming: IncomingCoupon,
): string | null {
  for (const applied of existing) {
    if (applied.code === incoming.code) {
      return `Coupon ${incoming.code} is already applied.`;
    }

    if (
      incoming.scope === "seller" &&
      applied.scope === "seller" &&
      applied.storeId === incoming.storeId
    ) {
      return `A coupon for this store is already applied (${applied.code}). Remove it first.`;
    }

    if (incoming.scope === "admin" && applied.scope === "admin") {
      return `Only one platform-wide coupon can be applied at a time (${applied.code}). Remove it first.`;
    }
  }
  return null;
}
