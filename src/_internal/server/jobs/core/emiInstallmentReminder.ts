import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { orderRepository } from "../../../../repositories";
import type { EmiInstallment } from "../../../../features/orders/schemas/firestore";
import type { JobContext } from "../runtime/types";

const REMINDER_WINDOW_MS = 3 * 86_400_000;

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(value as string);
}

/**
 * EMI reminder sweep — nudges buyers ahead of an upcoming installment due
 * date and flips overdue-but-unpaid installments to `status: "overdue"`.
 * `reminderSentAt` gates re-notification so a buyer isn't paged on every
 * sweep run for the same installment.
 */
export async function runEmiInstallmentReminder(ctx: JobContext): Promise<void> {
  ctx.logger.info("EMI installment reminder sweep starting");

  const orders = await orderRepository.getActiveEmiOrders();
  if (orders.length === 0) {
    ctx.logger.info("No active EMI orders found");
    return;
  }

  let remindersSent = 0;
  let overdueFlagged = 0;

  for (const { id, data: order } of orders) {
    const installments = order.emiInstallments ?? [];
    if (!order.userId || installments.length === 0) continue;

    let changed = false;
    const updated: EmiInstallment[] = [];

    for (const inst of installments) {
      if (inst.status !== "pending" || inst.reminderSentAt) {
        updated.push(inst);
        continue;
      }
      const dueDate = toDate(inst.dueDate);
      const isOverdue = dueDate.getTime() <= ctx.now.getTime();
      const isUpcoming = !isOverdue && dueDate.getTime() <= ctx.now.getTime() + REMINDER_WINDOW_MS;
      if (!isOverdue && !isUpcoming) {
        updated.push(inst);
        continue;
      }

      try {
        await sendNotification({
          userId: order.userId,
          type: isOverdue ? "emi_installment_overdue" : "emi_installment_due_soon",
          priority: isOverdue ? "high" : "normal",
          title: isOverdue ? "EMI installment overdue" : "EMI installment due soon",
          message: isOverdue
            ? `Installment ${inst.index} for order ${id} is overdue. Pay now to avoid delaying your shipment.`
            : `Installment ${inst.index} for order ${id} (₹${inst.amount.toFixed(2)}) is due on ${dueDate.toDateString()}.`,
          relatedId: id,
          relatedType: "order",
          actionUrl: `/user/orders/view/${id}`,
        } as never);
        if (isOverdue) overdueFlagged++;
        else remindersSent++;
        changed = true;
        updated.push({
          ...inst,
          status: isOverdue ? "overdue" : inst.status,
          reminderSentAt: ctx.now,
        });
      } catch (err) {
        void normalizeError(err);
        ctx.logger.warn("EMI reminder notification failed", {
          err: err instanceof Error ? err.message : String(err),
        });
        updated.push(inst);
      }
    }

    if (changed) {
      await orderRepository.update(id, { emiInstallments: updated });
    }
  }

  ctx.logger.info("EMI installment reminder sweep complete", { remindersSent, overdueFlagged });
}
