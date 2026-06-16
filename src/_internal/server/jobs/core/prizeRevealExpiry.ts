import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../runtime/types";
import { ORDER_FIELDS, PRODUCT_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";
import type { JsonValue } from "@mohasinac/appkit";

const ORDER_COLLECTION = "orders";

export async function runPrizeRevealExpiry(ctx: JobContext): Promise<void> {
  ctx.logger.info("Prize reveal expiry sweep starting");

  const snap = await ctx.db
    .collection(ORDER_COLLECTION)
    .where(ORDER_FIELDS.PAYMENT_STATUS, "==", ORDER_FIELDS.PAYMENT_STATUS_VALUES.PAID)
    .where(ORDER_FIELDS.STATUS, "in", [
      ORDER_FIELDS.STATUS_VALUES.PENDING,
      ORDER_FIELDS.STATUS_VALUES.CONFIRMED,
      ORDER_FIELDS.STATUS_VALUES.PROCESSING,
    ])
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_DEADLINE, "<", ctx.now)
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
      prizeWon?: JsonValue;
      productTitle?: string;
      prizeDrawProductId?: string;
    };
    if (order.prizeWon) continue;
    if (!order.prizeDrawProductId) continue;

    await doc.ref.update({
      [ORDER_FIELDS.STATUS]: ORDER_FIELDS.STATUS_VALUES.REFUNDED,
      [ORDER_FIELDS.PAYMENT_STATUS]: ORDER_FIELDS.PAYMENT_STATUS_VALUES.REFUNDED,
      isNonRefundable: false,
      prizeRevealExpired: true,
      [COMMON_FIELDS.UPDATED_AT]: ctx.now,
    });

    if (order.userId) {
      try {
        await sendNotification({
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
        void normalizeError(err);
        ctx.logger.warn("Reveal-expired notification failed", { err: err instanceof Error ? err.message : String(err) });
      }
    }
    refunded++;
  }

  ctx.logger.info("Prize reveal expiry sweep complete", { refunded });
}
