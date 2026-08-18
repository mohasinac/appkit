import { orderRepository } from "../../../../repositories";
import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { restoreStockForOrder } from "../../features/checkout/stock-restore";
import { OrderStatusValues } from "../../../../features/orders/schemas/firestore";
import { ORDER_MESSAGES } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

const DEFAULT_TIMEOUT_HOURS = 24;

/**
 * COD 24h safety net. Orders with a `paymentDeadline` set (upi_manual/cash/
 * emi) are excluded — those belong to the 15-minute `paymentWindowTimeout`
 * sweep instead (Tier PP), which fires far sooner. Leaving them in this
 * job's scope too would just be redundant double-processing against the
 * same order under two different `cancellationReason`s.
 */
export async function runPendingOrderTimeout(ctx: JobContext): Promise<void> {
  const timeoutHours = Number(ctx.env("ORDER_TIMEOUT_HOURS") ?? DEFAULT_TIMEOUT_HOURS);
  ctx.logger.info(`Scanning orders unpaid > ${timeoutHours}h`);

  const timedOutAll = await orderRepository.getTimedOutPending(timeoutHours);
  const timedOut = timedOutAll.filter((entry) => !entry.data.paymentDeadline);
  if (timedOut.length === 0) {
    ctx.logger.info("No timed-out pending orders found");
    return;
  }

  let restored = 0;
  for (const entry of timedOut) {
    try {
      // Stock decremented at checkout for every payment method (including
      // COD) was never restored on timeout-cancel before this fix.
      await restoreStockForOrder(ctx.db, { ...entry.data, id: entry.id }, {
        status: OrderStatusValues.CANCELLED,
        cancellationDate: ctx.now,
        cancellationReason: "payment_timeout",
        updatedAt: ctx.now,
      });
      restored += 1;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Failed to cancel + restore stock for timed-out order", err, {
        orderId: entry.id,
      });
    }
  }

  await Promise.allSettled(
    timedOut.map((entry) =>
      sendNotification({
        userId: entry.data.userId,
        type: "order_cancelled",
        priority: "normal",
        title: ORDER_MESSAGES.CANCELLED_TITLE,
        message: ORDER_MESSAGES.CANCELLED_TIMEOUT_MESSAGE(entry.data.productTitle, timeoutHours),
        relatedId: entry.id,
        relatedType: "order",
      }),
    ),
  );

  ctx.logger.info("Pending order timeout complete", { cancelled: timedOut.length, restored });
}
