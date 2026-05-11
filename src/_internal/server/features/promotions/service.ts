import { couponsRepository } from "../../../../repositories";
import {
  CouponNotFoundError,
  CouponExpiredError,
  CouponUsageLimitError,
  CouponPerUserLimitError,
  CouponMinPurchaseError,
  CouponScopeError,
} from "../../../shared/features/promotions/errors";
import type { ApplyCouponInput } from "../../../shared/features/promotions/schema";

export async function validateCoupon(input: ApplyCouponInput, userId: string) {
  const coupon = await couponsRepository.getCouponByCode(input.code).catch(() => null);
  if (!coupon) throw new CouponNotFoundError(input.code);
  if (!coupon.validity?.isActive) throw new CouponExpiredError(input.code);

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
    discount = Math.round((cartTotal * value) / 100);
    if (maxDiscount) discount = Math.min(discount, maxDiscount);
  } else if (type === "fixed") {
    discount = Math.min(value, cartTotal);
  } else if (type === "free_shipping") {
    discount = 0; // handled separately in checkout
  }
  return discount;
}
