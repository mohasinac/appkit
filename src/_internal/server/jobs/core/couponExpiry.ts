import { couponsRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";

export async function runCouponExpiry(ctx: JobContext): Promise<void> {
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
}
