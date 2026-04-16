/**
 * Admin Coupon Domain Actions (appkit)
 *
 * Coupon CRUD and admin list functions. Auth and rate-limit are delegated to
 * consumer-side thin server-action wrappers.
 */

import { couponsRepository } from "../../promotions";
import { NotFoundError, ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import type {
  CouponCreateInput,
  CouponDocument,
  CouponUpdateInput,
} from "../../promotions";

export async function adminCreateCoupon(
  adminId: string,
  input: CouponCreateInput,
): Promise<CouponDocument> {
  const coupon = await couponsRepository.create({
    ...input,
    createdBy: adminId,
    validity: {
      ...input.validity,
      startDate: new Date(input.validity.startDate),
      endDate: input.validity.endDate
        ? new Date(input.validity.endDate)
        : undefined,
    },
    stats: {
      totalUses: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    },
  });

  serverLogger.info("adminCreateCoupon", {
    adminId,
    couponId: coupon.id,
    code: coupon.code,
  });

  return coupon;
}

export async function adminUpdateCoupon(
  adminId: string,
  id: string,
  input: CouponUpdateInput,
): Promise<CouponDocument> {
  if (!id?.trim()) {
    throw new ValidationError("id is required");
  }

  const existing = await couponsRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Coupon not found");
  }

  const updateData: CouponUpdateInput = {
    ...input,
    ...(input.validity
      ? {
          validity: {
            ...input.validity,
            startDate: input.validity.startDate
              ? new Date(input.validity.startDate)
              : existing.validity.startDate,
            endDate: input.validity.endDate
              ? new Date(input.validity.endDate)
              : existing.validity.endDate,
          },
        }
      : {}),
  };

  const updated = await couponsRepository.update(id, updateData);

  serverLogger.info("adminUpdateCoupon", {
    adminId,
    couponId: id,
  });

  return updated;
}

export async function adminDeleteCoupon(
  adminId: string,
  id: string,
): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError("id is required");
  }

  const existing = await couponsRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Coupon not found");
  }

  await couponsRepository.delete(id);

  serverLogger.info("adminDeleteCoupon", {
    adminId,
    couponId: id,
  });
}

export async function listAdminCoupons(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<CouponDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };

  return couponsRepository.list(model);
}
