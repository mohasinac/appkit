import { notificationRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";

const PRODUCT_COLLECTION = "products";
const ORDER_COLLECTION = "orders";

export async function runPrizeRevealOpen(ctx: JobContext): Promise<void> {
  ctx.logger.info("Prize reveal open sweep starting");

  const snap = await ctx.db
    .collection(PRODUCT_COLLECTION)
    .where("listingType", "==", "prize-draw")
    .where("prizeRevealStatus", "==", "pending")
    .where("prizeRevealWindowStart", "<=", ctx.now)
    .limit(100)
    .get();

  if (snap.empty) {
    ctx.logger.info("No prize draws to open");
    return;
  }

  for (const doc of snap.docs) {
    const product = doc.data() as {
      id?: string;
      title?: string;
      prizeRevealDeadlineDays?: number;
    };

    await doc.ref.update({
      prizeRevealStatus: "open",
      updatedAt: ctx.now,
    });

    const orders = await ctx.db
      .collection(ORDER_COLLECTION)
      .where("prizeDrawProductId", "==", doc.id)
      .where("paymentStatus", "==", "paid")
      .where("status", "in", ["pending", "confirmed", "processing"])
      .get();

    let notified = 0;
    for (const orderDoc of orders.docs) {
      const order = orderDoc.data() as {
        userId?: string;
        prizeWon?: unknown;
      };
      if (!order.userId || order.prizeWon) continue;
      try {
        await notificationRepository.create({
          userId: order.userId,
          type: "prize_reveal_ready",
          priority: "high",
          title: "Your reveal is ready!",
          message: `Reveal your prize for "${product.title ?? "draw"}". You have ${
            product.prizeRevealDeadlineDays ?? 3
          } days to claim it.`,
          relatedId: orderDoc.id,
          relatedType: "order",
          actionUrl: `/user/orders/view/${orderDoc.id}`,
        } as never);
        notified++;
      } catch (err) {
        ctx.logger.warn("Reveal-ready notification failed", { err });
      }
    }
    ctx.logger.info("Opened prize draw", {
      productId: doc.id,
      buyersNotified: notified,
    });
  }
}
