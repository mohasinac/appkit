import { couponsRepository } from "../../../../features/promotions/repository/coupons.repository";
import { roundRupees } from "../../../../utils/number.formatter";
import {
  CouponNotFoundError,
  CouponExpiredError,
  CouponUsageLimitError,
  CouponPerUserLimitError,
  CouponMinPurchaseError,
  CouponScopeError,
} from "../../../shared/features/promotions/errors";
import type { ApplyCouponInput } from "../../../shared/features/promotions/schema";

export async function validateCoupon(
  input: ApplyCouponInput,
  userId: string,
  /**
   * The redeemer's roles, resolved from the SESSION by the caller.
   *
   * 🛑 Never from the request body. This gates a coupon that can zero an
   * order, so the one thing it must not trust is the party being gated.
   *
   * ⚠ `undefined` means "the caller did not resolve them", which is NOT the
   * same as "this user has no roles" — and the difference decides a money
   * question, so it is kept as a third state rather than defaulted to `[]`.
   */
  redeemerRoles?: readonly string[],
) {
  const coupon = await couponsRepository.getCouponByCode(input.code);
  if (!coupon) throw new CouponNotFoundError(input.code);
  if (!coupon.validity?.isActive) throw new CouponExpiredError(input.code);

  /*
   * ── ROLE GATE — fails CLOSED ──────────────────────────────────────────────
   *
   * Absent or empty `allowedRoles` means everyone, so every coupon already
   * stored is unaffected and this cannot change an existing redemption.
   *
   * 🛑 When it IS set and the roles could not be resolved, the coupon is
   * REFUSED. The alternative — treating an unresolved session as permitted —
   * would make the gate decorative for exactly the caller that forgot to pass
   * roles, which is the "declared but unwired" shape on a path where the cost
   * is free merchandise.
   *
   * ⚠ Reported as `CouponNotFoundError`, deliberately, NOT as a scope error:
   * a distinct "you are not allowed to use this" reply confirms the code is
   * REAL, which turns the checkout into an oracle for guessing hidden codes.
   * To anyone without the role, the code simply does not exist.
   */
  const allowedRoles = coupon.restrictions?.allowedRoles;
  if (allowedRoles && allowedRoles.length > 0) {
    const roles = redeemerRoles ?? [];
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new CouponNotFoundError(input.code);
    }
  }

  /*
   * The per-user gate — ANDed with the role gate, never ORed. A prize coupon
   * is bound to its WINNER, so a leaked code is worthless to anyone else.
   * Reported as not-found for the same anti-oracle reason as above.
   */
  const allowedUserIds = coupon.restrictions?.allowedUserIds;
  if (allowedUserIds && allowedUserIds.length > 0) {
    if (!userId || !allowedUserIds.includes(userId)) {
      throw new CouponNotFoundError(input.code);
    }
  }

  const now = Date.now();
  const startDate = coupon.validity?.startDate ? new Date(coupon.validity.startDate).getTime() : 0;
  const endDate = coupon.validity?.endDate ? new Date(coupon.validity.endDate).getTime() : Infinity;
  if (now < startDate || now > endDate) throw new CouponExpiredError(input.code);

  const totalLimit = coupon.usage?.totalLimit;
  const currentUsage = coupon.usage?.currentUsage ?? 0;
  if (totalLimit && currentUsage >= totalLimit) throw new CouponUsageLimitError(input.code);

  const perUserLimit = coupon.usage?.perUserLimit ?? 1;
  const userUsageCount = await couponsRepository.getUserCouponUsageCount(userId, coupon.id).catch(() => 0);
  if (userUsageCount >= perUserLimit) throw new CouponPerUserLimitError(input.code);

  const minPurchase = coupon.discount?.minPurchase ?? 0;
  if (input.cartTotal < minPurchase) throw new CouponMinPurchaseError(minPurchase);

  if (input.isFirstTimeUser === false && coupon.restrictions?.firstTimeUserOnly) {
    throw new CouponScopeError();
  }

  return coupon;
}

export function computeDiscount(coupon: Awaited<ReturnType<typeof validateCoupon>>, cartTotal: number): number {
  const type = coupon.type;
  const value = coupon.discount?.value ?? 0;
  const maxDiscount = coupon.discount?.maxDiscount;

  let discount = 0;
  if (type === "percentage") {
    // audit-money-units-ok: percentage divisor (value is 0-100), not paise
    discount = roundRupees((cartTotal * value) / 100);
    if (maxDiscount) discount = Math.min(discount, maxDiscount);
  } else if (type === "fixed") {
    discount = Math.min(value, cartTotal);
  } else if (type === "free_shipping") {
    discount = 0; // handled separately in checkout
  }
  return discount;
}
