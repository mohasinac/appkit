import { orderRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { ORDER_MESSAGES } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

const DEFAULT_TIMEOUT_HOURS = 24;

export async function runPendingOrderTimeout(ctx: JobContext): Promise<void> {
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
  }
  await batch.commit();

  await Promise.allSettled(
    timedOut.map((entry) =>
      sendNotification({
        userId: entry.data.userId,
        type: "order_cancelled",
        priority: "normal",
        title: ORDER_MESSAGES.CANCELLED_TITLE,
        message: ORDER_MESSAGES.CANCELLED_TIMEOUT_MESSAGE(entry.data.productTitle, timeoutHours),
        relatedId: entry.data.id,
        relatedType: "order",
      }),
    ),
  );

  ctx.logger.info("Pending order timeout complete", { cancelled: timedOut.length });
}
