/**
 * How a buyer-applied coupon splits across the sellers in one cart.
 *
 * WHY THIS MOVED HERE (2026-10-21): the implementation was module-private
 * inside `_internal/server/features/checkout/actions.ts`, where three order
 * paths could reach it and the **gateway capture route could not**.
 *
 * 🛑 So `/api/payment/create-order` — the one place that decides what the
 * buyer's card is actually charged — had NO COUPON TERM ANYWHERE IN THE FILE.
 * Measured: zero occurrences of "coupon" or "discount", and
 *
 *     rawTotal = subtotalRs + platformFee + gstOnFee + addonFees + shippingFee
 *
 * while `createOrderForGroup` (COD/UPI), `previewCheckoutPricing` and
 * `createRazorpayGroupOrder` all compute `max(0, total − couponDiscount) + …`.
 *
 * The consequence is a live overcharge on every coupon order paid by card: the
 * preview shows ₹X−discount, the gateway captures ₹X, and the order records
 * ₹X−discount. And it is invisible in our own data, because the post-capture
 * amount guard is ONE-SIDED (`paid < expected − 1`), so an over-capture never
 * trips it. Nothing in the system disagreed with itself; only the buyer's card
 * statement did.
 *
 * `_internal/shared/` rather than `_internal/server/` because this is pure
 * arithmetic with no Firestore reach, and because `_internal/shared` is the
 * only one of the three a consumer route can be served from. It is the first
 * increment of the single-pipeline extraction.
 */

import { roundRupees } from "../../../utils/number.formatter";
import type { CartAppliedCoupon } from "../../../features/cart/schemas/firestore";

export interface GroupCouponDiscountResult {
  couponDiscount: number;
  appliedDiscounts: {
    code: string;
    couponId?: string;
    /**
     * 🛑 This is NOT `CouponType`, and the two are easy to confuse now that
     * both live in this file. This one records WHERE the discount came from —
     * a coupon the buyer typed, a deal, or an automatic rule — and it is what
     * the order document stores in `appliedDiscounts[]`.
     *
     * `CartAppliedCoupon.type` is the coupon's own kind (`percentage`,
     * `points_earn`, …) and is what the loop below skips on. Reading one where
     * the other is meant would compile cleanly and be wrong: every value of
     * this union is absent from that one, so the `points_earn` skip would
     * never fire and a points coupon would discount the order.
     */
    type: "coupon" | "deal" | "auto";
    discountAmount: number;
    scope?: "admin" | "seller";
    storeId?: string;
  }[];
  /**
   * The per-group discount, in the order the groups were passed.
   *
   * 🛑 Surfaced rather than aggregated-and-forgotten. It was already being
   * computed inside the loop below and then summed away — the same shape as
   * `CheckoutPricingPreviewStore`'s per-store fees, which existed only as an
   * aggregate until a seller card needed them.
   *
   * The caller that needs it is the capture route's points tender: the
   * per-group base includes that group's own discount, and re-deriving it
   * there would be a second copy of the apportionment rule (Root Cause #75) on
   * the one path D37 proves gets left behind.
   */
  perGroup: { storeId: string | undefined; couponDiscount: number }[];
}

/**
 * Prorates every buyer-applied coupon against one seller-group's total.
 *
 * Pure — no side effects. Usage-accumulator bookkeeping is layered on by the
 * callers that actually place an order, which is what lets the preview and the
 * capture route call this without recording a redemption.
 *
 * A seller-scoped coupon applies only to its own store's group; an admin
 * coupon prorates across every group by `groupTotal / cartSubtotal`. Clamped
 * to the group total at the end, so a coupon can never make a group negative.
 */
export function computeGroupCouponDiscount(
  appliedCoupons: CartAppliedCoupon[],
  groupLines: { itemId: string; lineTotal: number }[],
  groupTotal: number,
  cartSubtotal: number,
  storeId: string | undefined,
): GroupCouponDiscountResult {
  let couponDiscount = 0;
  const appliedDiscounts: GroupCouponDiscountResult["appliedDiscounts"] = [];

  for (const coupon of appliedCoupons) {
    /*
     * 🛑 D51 — a `points_earn` coupon DISCOUNTS NOTHING. It awards points on
     * the post-discount amount paid, and it carries `pointsPercent` rather than
     * a discount value.
     *
     * Skipped here rather than relied on to carry `discountAmount: 0`. The
     * apply route writes whatever `validateCouponForCart` returned, and a
     * points coupon that ever came back with a non-zero `discountAmount` —
     * through a mis-seeded `discount.value`, or an admin editing a coupon's
     * type after creation — would silently discount the order AND award points.
     * A type check cannot be bypassed by bad data; a zero cannot be relied on.
     */
    if (coupon.type === "points_earn") continue;

    let couponGroupDiscount = 0;
    const isSellerScoped = coupon.scope === "seller" && coupon.storeId;
    if (isSellerScoped) {
      if (coupon.storeId !== storeId) continue;
      if (coupon.applicableItemIds?.length) {
        const eligibleTotal = groupLines
          .filter((l) => coupon.applicableItemIds!.includes(l.itemId))
          .reduce((s, l) => s + l.lineTotal, 0);
        couponGroupDiscount =
          eligibleTotal > 0
            ? Math.min(
                roundRupees((eligibleTotal / groupTotal) * coupon.discountAmount),
                eligibleTotal,
              )
            : 0;
      } else {
        couponGroupDiscount = Math.min(coupon.discountAmount, groupTotal);
      }
    } else if (cartSubtotal > 0) {
      couponGroupDiscount = Math.min(
        roundRupees((groupTotal / cartSubtotal) * coupon.discountAmount),
        groupTotal,
      );
    }

    if (couponGroupDiscount > 0) {
      couponDiscount += couponGroupDiscount;
      appliedDiscounts.push({
        code: coupon.code,
        couponId: coupon.couponId,
        type: "coupon",
        discountAmount: couponGroupDiscount,
        scope: coupon.scope,
        storeId: coupon.storeId,
      });
    }
  }

  couponDiscount = Math.min(couponDiscount, groupTotal);
  return { couponDiscount, appliedDiscounts };
}

/**
 * The whole cart's discount, summed over its seller-groups.
 *
 * 🛑 This exists so a caller holding only a cart-wide subtotal cannot be
 * tempted to apply a coupon to it directly. Doing so is wrong in two ways that
 * cancel out on a single-seller cart and diverge on a multi-seller one: a
 * seller-scoped coupon would be applied to other sellers' items, and the
 * per-group clamp (`min(discount, groupTotal)`) would not bind. The capture
 * route holds exactly that shape, which is how it ended up with no discount at
 * all rather than a wrong one.
 */
export function computeCartCouponDiscount(
  appliedCoupons: CartAppliedCoupon[],
  groups: {
    storeId: string | undefined;
    lines: { itemId: string; lineTotal: number }[];
  }[],
): GroupCouponDiscountResult {
  const cartSubtotal = groups.reduce(
    (sum, g) => sum + g.lines.reduce((s, l) => s + l.lineTotal, 0),
    0,
  );
  let couponDiscount = 0;
  const appliedDiscounts: GroupCouponDiscountResult["appliedDiscounts"] = [];
  const perGroup: GroupCouponDiscountResult["perGroup"] = [];
  for (const group of groups) {
    const groupTotal = group.lines.reduce((s, l) => s + l.lineTotal, 0);
    const res = computeGroupCouponDiscount(
      appliedCoupons,
      group.lines,
      groupTotal,
      cartSubtotal,
      group.storeId,
    );
    couponDiscount += res.couponDiscount;
    appliedDiscounts.push(...res.appliedDiscounts);
    /*
     * 🛑 NOT rounded here, and the aggregate below IS. Rounding each group
     * then summing can differ from summing then rounding by a paisa per group,
     * and the aggregate is what the gateway captures — so the group figures
     * stay raw and the caller rounds its own composed base once, exactly as
     * `createOrderForGroup` does with a single `roundRupees` on `orderTotal`
     * (D42). A rounded-then-summed discount is how a total ends up a paisa
     * short of its own lines.
     */
    perGroup.push({ storeId: group.storeId, couponDiscount: res.couponDiscount });
  }
  return { couponDiscount: roundRupees(couponDiscount), appliedDiscounts, perGroup };
}
