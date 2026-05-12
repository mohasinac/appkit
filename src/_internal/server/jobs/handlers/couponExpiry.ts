import { couponsRepository } from "../../../../repositories";
import type { ScheduleHandler } from "../runtime/types";

export const couponExpiryHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Starting coupon expiry sweep");

  const refs = await couponsRepository.getExpiredActiveRefs(ctx.now);
  if (refs.length === 0) {
    ctx.logger.info("No expired active coupons found");
    return;
  }

  const batch = ctx.db.batch();
  refs.forEach((ref) => couponsRepository.deactivateInBatch(batch, ref));
  await batch.commit();

  ctx.logger.info("Coupon expiry complete", { deactivated: refs.length });
};
