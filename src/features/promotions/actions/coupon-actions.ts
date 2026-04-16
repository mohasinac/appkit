/**
 * Promotions / Coupon Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { couponsRepository } from "../repository/coupons.repository";
import type { CouponValidationResult } from "../schemas";

export type { CouponValidationResult };

export interface CouponCartValidationResult {
  valid: boolean;
  discountAmount: number;
  eligibleSubtotal?: number;
  eligibleProductIds?: string[];
  scope?: "admin" | "seller";
  sellerId?: string;
  coupon?: unknown;
  error?: string;
}

export type CouponCartItem = {
  productId: string;
  sellerId: string;
  price: number;
  quantity: number;
  isPreOrder: boolean;
  isAuction: boolean;
};

export async function validateCoupon(
  userId: string,
  code: string,
  orderTotal: number,
): Promise<CouponValidationResult> {
  return couponsRepository.validateCoupon(
    code,
    userId,
    orderTotal,
  ) as Promise<CouponValidationResult>;
}

export async function validateCouponForCart(
  userId: string,
  code: string,
  cartItems: CouponCartItem[],
): Promise<CouponCartValidationResult> {
  const result = await couponsRepository.validateCouponForCart(
    code,
    userId,
    cartItems,
  );

  return {
    valid: result.valid,
    discountAmount: result.discountAmount ?? 0,
    eligibleSubtotal: result.eligibleSubtotal,
    eligibleProductIds: result.eligibleProductIds,
    scope: result.scope,
    sellerId: result.sellerId,
    coupon: result.coupon,
    error: result.message,
  };
}
