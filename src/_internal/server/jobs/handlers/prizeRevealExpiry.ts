/**
 * scheduledPrizeRevealExpiry — every 6 hours (SB8-B).
 *
 * Finds paid prize-draw orders where `prizeRevealDeadline < now` AND
 * `prizeWon` is unset. Marks them as REFUNDED + notifies the buyer. The
 * actual Razorpay refund is queued — this handler only flips the order
 * status so the buyer's allowance is freed up immediately.
 */

import { notificationRepository } from "../../../../repositories";
import type { ScheduleHandler } from "../runtime/types";

const ORDER_COLLECTION = "orders";

export const prizeRevealExpiryHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Prize reveal expiry sweep starting");

  const snap = await ctx.db
    .collection(ORDER_COLLECTION)
    .where("paymentStatus", "==", "paid")
    .where("status", "in", ["pending", "confirmed", "processing"])
    .where("prizeRevealDeadline", "<", ctx.now)
    .limit(200)
    .get();

  if (snap.empty) {
    ctx.logger.info("No prize-draw orders past deadline");
    return;
  }

  let refunded = 0;
  for (const doc of snap.docs) {
    const order = doc.data() as {
      userId?: string;
      prizeWon?: unknown;
      productTitle?: string;
      prizeDrawProductId?: string;
    };
    if (order.prizeWon) continue; // already revealed
    if (!order.prizeDrawProductId) continue; // not a prize-draw order

    await doc.ref.update({
      status: "refunded",
      paymentStatus: "refunded",
      isNonRefundable: false,
      prizeRevealExpired: true,
      updatedAt: ctx.now,
    });

    if (order.userId) {
      try {
        await notificationRepository.create({
          userId: order.userId,
          type: "prize_reveal_expired",
          priority: "high",
          title: "Reveal deadline passed — refunded",
          message: `Your entry for "${order.productTitle ?? "the draw"}" expired without a reveal. We've refunded the order.`,
          relatedId: doc.id,
          relatedType: "order",
          actionUrl: `/user/orders/view/${doc.id}`,
        } as never);
      } catch (err) {
        ctx.logger.warn("Reveal-expired notification failed", { err });
      }
    }
    refunded++;
  }

  ctx.logger.info("Prize reveal expiry sweep complete", { refunded });
};
