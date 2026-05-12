import { notificationRepository } from "../../../../repositories";
import type { ScheduleHandler } from "../runtime/types";
import { NOTIFICATION_TTL_DAYS } from "./messages";
import { batchDelete } from "./_helpers";

export const notificationPruneHandler: ScheduleHandler = async (ctx) => {
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
};
