import { notificationRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";
import { NOTIFICATION_TTL_DAYS } from "../handlers/messages";
import { batchDelete } from "../handlers/_helpers";

export async function runNotificationPrune(ctx: JobContext): Promise<void> {
  ctx.logger.info(
    `Pruning read notifications older than ${NOTIFICATION_TTL_DAYS} days`,
  );
  const refs = await notificationRepository.getOldReadRefs(NOTIFICATION_TTL_DAYS);
  if (refs.length === 0) {
    ctx.logger.info("No stale read notifications found");
    return;
  }
  const deleted = await batchDelete(ctx, refs);
  ctx.logger.info("Notification prune complete", { deleted });
}
