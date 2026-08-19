import { orderRepository } from "../../../../repositories";
import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { restoreStockForOrder } from "../../features/checkout/stock-restore";
import { OrderStatusValues } from "../../../../features/orders/schemas/firestore";
import { PAYMENT_WINDOW_EXPIRED_REASON } from "../../../../features/orders/constants/payment-window";
import { ORDER_MESSAGES } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

/**
 * 15-minute payment window sweep — cancels + restocks any `upi_manual`/
 * `cash`/`emi` order still `pending`/`pending` with no proof uploaded past
 * its `paymentDeadline`. Runs every 5 minutes (`EVERY_5_MIN`), so an order
 * can overshoot its 15-minute deadline by up to ~5 minutes before this
 * catches it — acceptable, matches the existing tight-interval precedent
 * (`prizeRevealOpen`/`prizeRevealClose`) rather than inventing a 1-minute
 * cron that would multiply invocation cost for marginal UX gain.
 *
 * Orders that already have a `paymentProofUrl` are excluded by the
 * repository query — those are the 2-hour auto-approve sweep's domain
 * (`paymentReviewAutoApprove`), not this one's.
 */
export async function runPaymentWindowTimeout(ctx: JobContext): Promise<void> {
  ctx.logger.info("Scanning orders past their 15-minute payment deadline");

  const expired = await orderRepository.getExpiredPaymentDeadlines();
  if (expired.length === 0) {
    ctx.logger.info("No expired payment-window orders found");
    return;
  }

  let restored = 0;
  for (const entry of expired) {
    try {
      await restoreStockForOrder(ctx.db, { ...entry.data, id: entry.id }, {
        status: OrderStatusValues.CANCELLED,
        cancellationDate: ctx.now,
        cancellationReason: PAYMENT_WINDOW_EXPIRED_REASON,
        updatedAt: ctx.now,
      });
      restored += 1;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Failed to cancel + restore stock for expired payment-window order", err, {
        orderId: entry.id,
      });
    }
  }

  await Promise.allSettled(
    expired.map((entry) =>
      sendNotification({
        userId: entry.data.userId,
        type: "order_cancelled",
        priority: "normal",
        title: ORDER_MESSAGES.CANCELLED_PAYMENT_WINDOW_TITLE,
        message: ORDER_MESSAGES.CANCELLED_PAYMENT_WINDOW_MESSAGE(entry.data.productTitle),
        relatedId: entry.id,
        relatedType: "order",
        orderWhatsappAddonPaid: entry.data.whatsappNotifyAddon === true,
      }),
    ),
  );

  ctx.logger.info("Payment window timeout sweep complete", {
    scanned: expired.length,
    restored,
  });
}
