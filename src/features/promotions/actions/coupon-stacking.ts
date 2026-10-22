/**
 * Coupon Stacking Rules
 *
 * A cart may hold at most one seller-scoped coupon per store, plus at most
 * one admin (platform-wide) coupon on top. Both scopes stack with each
 * other freely — the old `combineWithSellerCoupons` opt-out was removed
 * (2026-08-21): stacking is now unconditional as long as the buckets
 * (per-store, the single platform-wide slot, and the points-earn slot) don't
 * collide.
 *
 * ## 🛑 THREE buckets since 2026-10-22, and the third is not a nicety (D51)
 *
 * `RIPLI05` is a PERMANENT, site-wide, undeletable coupon that awards points
 * rather than discounting. With only the admin bucket it would occupy the one
 * platform-wide slot forever, and **every other platform coupon would be
 * unusable for as long as the points programme existed** — a seasonal sale
 * coupon could never be applied by anyone.
 *
 * The spec also requires it to stack with a discount coupon, because it awards
 * a percentage of the POST-discount amount paid. A design where the two cannot
 * coexist cannot implement that sentence at all.
 *
 * So the bucket is keyed on the coupon's TYPE, not its scope: a `points_earn`
 * coupon is admin-scoped like any platform coupon, and it is the type that
 * decides which slot it competes for.
 *
 * Pure function, no I/O — safe to call from both the cart-apply route and
 * the checkout re-validation pass.
 */
import type { CartAppliedCoupon } from "../../cart/schemas/firestore";
import type { CouponType } from "../types";

export interface IncomingCoupon {
  code: string;
  scope: "admin" | "seller";
  storeId?: string;
  /**
   * The coupon's type, which decides its bucket (D51).
   *
   * Optional, and absence means "a discount coupon" — every cart written
   * before `points_earn` existed carries no type on its applied-coupon
   * entries, and treating those as discount coupons is both correct and what
   * preserves the previous behaviour exactly.
   */
  type?: CouponType;
}

/** A points-earn coupon competes for its own slot, never the admin one. */
function isPointsEarn(coupon: { type?: CouponType }): boolean {
  return coupon.type === "points_earn";
}

/**
 * Returns a human-readable conflict message, or null when `incoming` can be
 * added alongside `existing` without violating the one-per-store +
 * one-global + one-points-earn rule.
 */
export function detectCouponConflict(
  existing: CartAppliedCoupon[],
  incoming: IncomingCoupon,
): string | null {
  const incomingIsPoints = isPointsEarn(incoming);

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

    const appliedIsPoints = isPointsEarn(applied as { type?: CouponType });

    /*
     * 🛑 The two admin-scoped buckets are checked SEPARATELY, and the order of
     * these two branches does not matter precisely because each requires both
     * sides to be in the same bucket. An earlier shape — testing scope first
     * and type second — would have let a points coupon collide with a discount
     * coupon, which is the whole defect.
     */
    if (incomingIsPoints && appliedIsPoints) {
      return `A points offer is already applied (${applied.code}). Remove it first.`;
    }

    if (
      !incomingIsPoints &&
      !appliedIsPoints &&
      incoming.scope === "admin" &&
      applied.scope === "admin"
    ) {
      return `Only one platform-wide coupon can be applied at a time (${applied.code}). Remove it first.`;
    }
  }
  return null;
}
