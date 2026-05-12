/**
 * Job handler: cancel pending orders that have not paid in time.
 *
 * Reads timeout-hours from `ctx.env("ORDER_TIMEOUT_HOURS")` (default 24).
 * Writes cancellation notifications atomically in the same Firestore batch.
 */

import { notificationRepository, orderRepository } from "../../../../repositories";
import { ORDER_MESSAGES } from "./messages";
import type { ScheduleHandler } from "../runtime/types";

const DEFAULT_TIMEOUT_HOURS = 24;

export const pendingOrderTimeoutHandler: ScheduleHandler = async (ctx) => {
  const timeoutHours = Number(ctx.env("ORDER_TIMEOUT_HOURS") ?? DEFAULT_TIMEOUT_HOURS);
  ctx.logger.info(`Scanning orders unpaid > ${timeoutHours}h`);

  const timedOut = await orderRepository.getTimedOutPending(timeoutHours);
  if (timedOut.length === 0) {
    ctx.logger.info("No timed-out pending orders found");
    return;
  }

  const batch = ctx.db.batch();
  for (const entry of timedOut) {
    orderRepository.cancelInBatch(batch, entry.ref);
    notificationRepository.createInBatch(batch, {
      userId: entry.data.userId,
      type: "order_cancelled",
      priority: "normal",
      title: ORDER_MESSAGES.CANCELLED_TITLE,
      message: ORDER_MESSAGES.CANCELLED_TIMEOUT_MESSAGE(entry.data.productTitle, timeoutHours),
      relatedId: entry.data.id,
      relatedType: "order",
    });
  }
  await batch.commit();

  ctx.logger.info("Pending order timeout complete", { cancelled: timedOut.length });
};
