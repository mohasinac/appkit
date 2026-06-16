import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../runtime/types";
import { PRODUCT_FIELDS, ORDER_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";
import type { JsonValue } from "@mohasinac/appkit";

const PRODUCT_COLLECTION = "products";
const ORDER_COLLECTION = "orders";
const PRIZE_DRAW_LISTING_TYPE = "prize-draw";

export async function runPrizeRevealOpen(ctx: JobContext): Promise<void> {
  ctx.logger.info("Prize reveal open sweep starting");

  const snap = await ctx.db
    .collection(PRODUCT_COLLECTION)
    .where(PRODUCT_FIELDS.LISTING_TYPE, "==", PRIZE_DRAW_LISTING_TYPE)
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_STATUS, "==", PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.PENDING)
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_START, "<=", ctx.now)
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
      [PRODUCT_FIELDS.PRIZE_REVEAL_STATUS]: PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.OPEN,
      [COMMON_FIELDS.UPDATED_AT]: ctx.now,
    });

    const orders = await ctx.db
      .collection(ORDER_COLLECTION)
      .where("prizeDrawProductId", "==", doc.id)
      .where(ORDER_FIELDS.PAYMENT_STATUS, "==", ORDER_FIELDS.PAYMENT_STATUS_VALUES.PAID)
      .where(ORDER_FIELDS.STATUS, "in", [
        ORDER_FIELDS.STATUS_VALUES.PENDING,
        ORDER_FIELDS.STATUS_VALUES.CONFIRMED,
        ORDER_FIELDS.STATUS_VALUES.PROCESSING,
      ])
      .get();

    let notified = 0;
    for (const orderDoc of orders.docs) {
      const order = orderDoc.data() as {
        userId?: string;
        prizeWon?: JsonValue;
      };
      if (!order.userId || order.prizeWon) continue;
      try {
        await sendNotification({
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
        void normalizeError(err);
        ctx.logger.warn("Reveal-ready notification failed", { err: err instanceof Error ? err.message : String(err) });
      }
    }
    ctx.logger.info("Opened prize draw", {
      productId: doc.id,
      buyersNotified: notified,
    });
  }
}
