import { notificationRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";
import { ORDER_FIELDS, PRODUCT_FIELDS } from "../../../../constants/field-names";

const ORDER_COLLECTION = "orders";
const ONE_DAY_MS = 86_400_000;

export async function runPrizeRevealReminder(ctx: JobContext): Promise<void> {
  ctx.logger.info("Prize reveal reminder sweep starting");

  const cutoff = new Date(ctx.now.getTime() + ONE_DAY_MS);

  const snap = await ctx.db
    .collection(ORDER_COLLECTION)
    .where(ORDER_FIELDS.PAYMENT_STATUS, "==", ORDER_FIELDS.PAYMENT_STATUS_VALUES.PAID)
    .where(ORDER_FIELDS.STATUS, "in", [
      ORDER_FIELDS.STATUS_VALUES.PENDING,
      ORDER_FIELDS.STATUS_VALUES.CONFIRMED,
      ORDER_FIELDS.STATUS_VALUES.PROCESSING,
    ])
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_DEADLINE, "<=", cutoff)
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_DEADLINE, ">", ctx.now)
    .limit(500)
    .get();

  let notified = 0;
  for (const doc of snap.docs) {
    const order = doc.data() as {
      userId?: string;
      prizeWon?: unknown;
      productTitle?: string;
      prizeDrawProductId?: string;
      prizeRevealDeadline?: { toDate?: () => Date } | Date;
    };
    if (!order.userId || order.prizeWon || !order.prizeDrawProductId) continue;
    try {
      await notificationRepository.create({
        userId: order.userId,
        type: "prize_reveal_reminder",
        priority: "normal",
        title: "Reveal expires within 24h",
        message: `Reveal your prize for "${order.productTitle ?? "the draw"}" today — unclaimed reveals are auto-refunded after the deadline.`,
        relatedId: doc.id,
        relatedType: "order",
        actionUrl: `/user/orders/view/${doc.id}`,
      } as never);
      notified++;
    } catch (err) {
      ctx.logger.warn("Reveal reminder notification failed", { err });
    }
  }
  ctx.logger.info("Prize reveal reminder sweep complete", { notified });
}
