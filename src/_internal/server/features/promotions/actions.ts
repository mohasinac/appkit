"use server";

import { couponsRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  applyCouponSchema,
  createCouponSchema,
  updateCouponSchema,
} from "../../../shared/features/promotions/schema";
import { validateCoupon, computeDiscount } from "./service";
import { CouponNotFoundError } from "../../../shared/features/promotions/errors";
import { ValidationError } from "../../../shared/errors/index";

export async function applyCouponAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  const parsed = applyCouponSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid coupon input");

  const coupon = await validateCoupon(parsed.data, user.uid);
  const discount = computeDiscount(coupon, parsed.data.cartTotal);

  await couponsRepository.applyCoupon(coupon.id, coupon.code, user.uid, [], discount);

  return { couponId: coupon.id, code: coupon.code, discount, type: coupon.type };
}

export async function createCouponAction(input: unknown) {
  const user = await requireRoleUser(["admin", "seller"]);
  const parsed = createCouponSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid coupon input");
  return couponsRepository.createWithId(
    `coupon-${parsed.data.code.toLowerCase()}`,
    { ...parsed.data, createdBy: user.uid, usage: { ...parsed.data.usage, currentUsage: 0 } } as any,
  );
}

export async function updateCouponAction(couponId: string, input: unknown) {
  await requireRoleUser(["admin", "seller"]);
  const coupon = await couponsRepository.findById(couponId).catch(() => null);
  if (!coupon) throw new CouponNotFoundError(couponId);
  const parsed = updateCouponSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid coupon input");
  return couponsRepository.update(couponId, parsed.data as any);
}

export async function deactivateCouponAction(couponId: string) {
  await requireRoleUser(["admin", "seller"]);
  return couponsRepository.update(couponId, { "validity.isActive": false } as any);
}
