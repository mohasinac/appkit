/**
 * Seller Coupon Domain Actions (appkit/features/promotions)
 *
 * Business logic for seller-scoped coupon management.
 * Auth, rate-limiting, and input validation are handled by the calling server action.
 */

import { serverLogger } from "../../../monitoring";
import { couponsRepository } from "../repository/coupons.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { buildSellerCouponCode } from "../schemas/firestore";
import {
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "../../../errors";
import type { CouponDocument } from "../schemas";

export interface SellerCreateCouponInput {
  sellerCode: string;
  name: string;
  description: string;
  type: "percentage" | "fixed" | "free_shipping" | "buy_x_get_y";
  applicableToAuctions: boolean;
  discount: {
    value: number;
    maxDiscount?: number;
    minPurchase?: number;
  };
  usage: {
    totalLimit?: number;
    perUserLimit?: number;
    currentUsage: number;
  };
  validity: {
    startDate: string;
    endDate?: string;
    isActive: boolean;
  };
  restrictions: {
    applicableProducts?: string[];
    applicableCategories?: string[];
    excludeProducts?: string[];
    excludeCategories?: string[];
    firstTimeUserOnly: boolean;
    combineWithSellerCoupons: boolean;
  };
}

export type SellerUpdateCouponInput = Partial<
  Omit<SellerCreateCouponInput, "sellerCode" | "applicableToAuctions">
>;

// ─── Create ────────────────────────────────────────────────────────────────

export async function sellerCreateCoupon(
  userId: string,
  input: SellerCreateCouponInput,
): Promise<CouponDocument> {
  const store = await storeRepository.findByOwnerId(userId);
  if (!store || store.status !== "active")
    throw new AuthorizationError(
      "Your store must be active before you can create coupons.",
    );

  const { sellerCode, applicableToAuctions, ...rest } = input;
  const fullCode = buildSellerCouponCode(store.storeSlug, sellerCode);

  const existing = await couponsRepository.getCouponByCode(fullCode);
  if (existing)
    throw new ValidationError(
      `Coupon code "${fullCode}" already exists. Please choose a different code.`,
    );

  const coupon = await couponsRepository.create({
    ...rest,
    code: fullCode,
    scope: "seller",
    sellerId: userId,
    storeSlug: store.storeSlug,
    applicableToAuctions,
    createdBy: userId,
    validity: {
      ...rest.validity,
      startDate: new Date(rest.validity.startDate),
      endDate: rest.validity.endDate
        ? new Date(rest.validity.endDate)
        : undefined,
    },
    restrictions: {
      ...rest.restrictions,
      applicableSellers: [userId],
      combineWithSellerCoupons: false,
    },
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
  });

  serverLogger.info("sellerCreateCoupon", {
    sellerId: userId,
    storeSlug: store.storeSlug,
    couponId: coupon.id,
    code: coupon.code,
  });
  return coupon;
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function sellerUpdateCoupon(
  userId: string,
  userRole: string,
  id: string,
  input: SellerUpdateCouponInput,
): Promise<CouponDocument> {
  if (!id) throw new ValidationError("Invalid coupon id");

  const existing = await couponsRepository.findById(id);
  if (!existing) throw new NotFoundError("Coupon not found");

  if (userRole !== "admin" && existing.sellerId !== userId)
    throw new AuthorizationError(
      "You do not have permission to update this coupon.",
    );

  const { validity: _validity, ...dataWithoutValidity } = input;
  const updated = await couponsRepository.update(id, {
    ...dataWithoutValidity,
    ...(input.validity
      ? {
          validity: {
            isActive: input.validity.isActive,
            startDate: input.validity.startDate
              ? new Date(input.validity.startDate)
              : existing.validity.startDate,
            endDate: input.validity.endDate
              ? new Date(input.validity.endDate)
              : existing.validity.endDate,
          },
        }
      : {}),
  });

  serverLogger.info("sellerUpdateCoupon", { sellerId: userId, couponId: id });
  return updated;
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function sellerDeleteCoupon(
  userId: string,
  userRole: string,
  id: string,
): Promise<void> {
  if (!id) throw new ValidationError("Invalid coupon id");

  const existing = await couponsRepository.findById(id);
  if (!existing) throw new NotFoundError("Coupon not found");

  if (userRole !== "admin" && existing.sellerId !== userId)
    throw new AuthorizationError(
      "You do not have permission to delete this coupon.",
    );

  await couponsRepository.delete(id);
  serverLogger.info("sellerDeleteCoupon", { sellerId: userId, couponId: id });
}
