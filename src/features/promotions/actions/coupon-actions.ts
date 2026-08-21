/**
 * Promotions / Coupon Domain Actions (appkit)
 *
 * Pure business functions â€” auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { couponsRepository } from "../repository/coupons.repository";
import { productRepository } from "../../products/repository/products.repository";
import type { CouponValidationResult } from "../schemas";
import type { ListingType } from "../../products/types";

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
  listingType: ListingType;
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

/**
 * Resolves productId → categorySlugs[] in a single batched `getAll` round-trip.
 * Passed into the coupon repository so it can enforce category restrictions
 * without importing the products repository itself. Invoked only when the
 * coupon actually has a category restriction.
 */
export async function resolveCouponCategorySlugs(
  productIds: string[],
): Promise<Map<string, string[]>> {
  const products = await productRepository.listByIds(productIds);
  return new Map(products.map((p) => [p.id, p.categorySlugs ?? []]));
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
    { resolveCategorySlugs: resolveCouponCategorySlugs },
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
