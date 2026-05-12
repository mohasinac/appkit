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
  storeId?: string;
  coupon?: unknown;
  error?: string;
}

export type CouponCartItem = {
  productId: string;
  storeId: string;
  price: number;
  quantity: number;
  /** Canonical listing-kind snapshot (SB1-G Phase 4). */
  listingType: "standard" | "auction" | "pre-order" | "prize-draw" | "bundle";
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
    storeId: result.storeId,
    coupon: result.coupon,
    error: result.message,
  };
}
