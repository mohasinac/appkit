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

  /*
   * Sequential, not `Promise.allSettled`.
   *
   * 🛑 `order_cancelled` is email-ELIGIBLE, so each of these reserves a unit
   * from the daily budget — a single Firestore document. Firestore sustains
   * roughly one write per second on one document, so a concurrent sweep would
   * contend on it, retry, and slow the job down more than the serial version
   * it replaced. Awaiting in a loop is the cheap fix; the alternative is
   * sharding the counter to defend a fan-out nobody needs.
   *
   * Safe on latency: this runs in a Firebase Function with a 300s budget, and
   * the set is bounded by however many orders timed out in one window.
   *
   * Failures stay non-fatal per order — a notification that will not send must
   * not stop the remaining cancellations being announced.
   */
  for (const entry of timedOut) {
    try {
      await sendNotification({
        userId: entry.data.userId,
        type: "order_cancelled",
        priority: "normal",
        title: ORDER_MESSAGES.CANCELLED_TITLE,
        message: ORDER_MESSAGES.CANCELLED_TIMEOUT_MESSAGE(entry.data.productTitle, timeoutHours),
        relatedId: entry.id,
        relatedType: "order",
        orderWhatsappAddonPaid: entry.data.whatsappNotifyAddon === true,
      });
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Failed to notify buyer of timed-out order (non-fatal)", err, {
        orderId: entry.id,
      });
    }
  }

  ctx.logger.info("Pending order timeout complete", { cancelled: timedOut.length, restored });
}
