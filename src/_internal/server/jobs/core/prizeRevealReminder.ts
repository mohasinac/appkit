import { notificationRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";

const ORDER_COLLECTION = "orders";
const ONE_DAY_MS = 86_400_000;

export async function runPrizeRevealReminder(ctx: JobContext): Promise<void> {
  ctx.logger.info("Prize reveal reminder sweep starting");

  const cutoff = new Date(ctx.now.getTime() + ONE_DAY_MS);

  const snap = await ctx.db
    .collection(ORDER_COLLECTION)
    .where("paymentStatus", "==", "paid")
    .where("status", "in", ["pending", "confirmed", "processing"])
    .where("prizeRevealDeadline", "<=", cutoff)
    .where("prizeRevealDeadline", ">", ctx.now)
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
