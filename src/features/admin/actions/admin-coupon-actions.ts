/**
 * Admin Coupon Domain Actions (appkit)
 *
 * Coupon CRUD and admin list functions. Auth and rate-limit are delegated to
 * consumer-side thin server-action wrappers.
 */

import { couponsRepository } from "../../promotions/repository/coupons.repository";
import { NotFoundError, ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { normalizeError } from "../../../errors/normalize";
import { claimedCouponsRepository } from "../../promotions/repository/claimed-coupons.repository";
import { recordAdminAction } from "../../../_internal/server/features/audit-log/actions";
import { AdminAuditActionValues } from "../../audit-log/schemas/firestore";
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

  /*
   * D59 — re-sync every wallet's denormalised snapshot. Nothing did this, so
   * `/user/coupons` kept rendering the terms as they were at CLAIM time while
   * checkout applied the live ones.
   *
   * 🛑 Display only, verified: redemption reads the live coupon via
   * `getCouponByCode`, so the drift never changed what was charged. Fixing it
   * stops the wallet advertising terms checkout will not honour.
   *
   * Best-effort and fire-and-forget: the admin's edit has already committed,
   * and a failed re-sync must not fail it. The fallback is a stale display —
   * which is exactly today's behaviour, so the worst case is no regression.
   */
  void claimedCouponsRepository
    .resyncSnapshotsForCoupon(id, {
      name: updated.name,
      ...(updated.description ? { description: updated.description } : {}),
      type: updated.type,
      scope: updated.scope ?? "admin",
      ...(updated.storeId ? { storeId: updated.storeId } : {}),
      discount: updated.discount,
      restrictions: updated.restrictions,
    })
    .then((n) => {
      if (n > 0) serverLogger.info("adminUpdateCoupon: wallet snapshots re-synced", { couponId: id, wallets: n });
      if (n === 500) {
        serverLogger.warn(
          "adminUpdateCoupon: snapshot re-sync hit its 500-wallet bound — later wallets still show stale terms",
          { couponId: id },
        );
      }
    })
    .catch((err: unknown) => {
      void normalizeError(err);
      serverLogger.warn("adminUpdateCoupon: wallet snapshot re-sync failed (display only)", { couponId: id });
    });

  serverLogger.info("adminUpdateCoupon", {
    adminId,
    couponId: id,
  });

  void recordAdminAction({
    actorUid: adminId,
    action: AdminAuditActionValues.COUPON_UPDATE,
    targetType: "coupon",
    targetId: id,
    targetLabel: existing.code,
    metadata: { changedFields: Object.keys(input) },
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
