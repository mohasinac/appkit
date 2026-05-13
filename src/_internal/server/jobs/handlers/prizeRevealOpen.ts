/**
 * scheduledPrizeRevealOpen — every 5 minutes.
 *
 * Flips `prizeRevealStatus` from "pending" to "open" on any prize-draw
 * product whose `prizeRevealWindowStart` has passed. Then (SB8-D) emits an
 * in-app notification to every buyer with an unrevealed paid order for that
 * draw: "Your reveal is ready — X reveals waiting. Reveal by [deadline]."
 */

import { notificationRepository } from "../../../../repositories";
import type { ScheduleHandler } from "../runtime/types";

const PRODUCT_COLLECTION = "products";
const ORDER_COLLECTION = "orders";

export const prizeRevealOpenHandler: ScheduleHandler = async (ctx) => {
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

    // SB8-D — notify buyers with paid unrevealed orders.
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
};
