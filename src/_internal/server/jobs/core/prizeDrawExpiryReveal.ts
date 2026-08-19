import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";
import { PRODUCT_FIELDS, ORDER_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";
import { assignPrizeDrawWinner } from "./prizeDrawAssignWinner";

const PRODUCT_COLLECTION = "products";
const ORDER_COLLECTION = "orders";
const PRIZE_DRAW_LISTING_TYPE = "prize-draw";

/**
 * "Scheduled" reveal mode, expiry half. Fires once a draw's
 * prizeRevealWindowEnd passes: assigns a winner to every paid, unrevealed
 * order for that draw, then closes it. Any prize items with no corresponding
 * order simply stay unrevealed / with the seller — that's expected on a
 * partial sellout, not an error.
 *
 * The sellout half of "scheduled" mode lives in prizeDrawSoldOutReveal.ts —
 * whichever fires first (expiry here, or a full sellout there) closes the
 * draw; this sweep naturally no-ops afterward since the product is already
 * "closed".
 */
export async function runPrizeDrawExpiryReveal(ctx: JobContext): Promise<void> {
  if (ctx.env("FEATURE_PRIZE_DRAWS") !== "true") {
    ctx.logger.info("FEATURE_PRIZE_DRAWS disabled — skipping prize-draw expiry reveal");
    return;
  }
  ctx.logger.info("Prize-draw expiry reveal sweep starting");

  const snap = await ctx.db
    .collection(PRODUCT_COLLECTION)
    .where(PRODUCT_FIELDS.LISTING_TYPE, "==", PRIZE_DRAW_LISTING_TYPE)
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_STATUS, "==", PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.OPEN)
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_END, "<=", ctx.now)
    .limit(100)
    .get();

  if (snap.empty) {
    ctx.logger.info("No prize draws past expiry");
    return;
  }

  for (const doc of snap.docs) {
    const product = doc.data() as { prizeDrawMode?: string };
    if (product.prizeDrawMode === "lottery") continue; // out of scope — separate mechanic

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

    let revealed = 0;
    for (const orderDoc of orders.docs) {
      const order = orderDoc.data() as { prizeWon?: unknown };
      if (order.prizeWon) continue;
      try {
        const result = await assignPrizeDrawWinner(ctx, {
          orderId: orderDoc.id,
          productId: doc.id,
        });
        if (result.kind === "revealed") revealed++;
      } catch (err) {
        void normalizeError(err);
        ctx.logger.error("Expiry reveal failed for order", err, { orderId: orderDoc.id, productId: doc.id });
      }
    }

    await doc.ref.update({
      [PRODUCT_FIELDS.PRIZE_REVEAL_STATUS]: PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.CLOSED,
      [COMMON_FIELDS.UPDATED_AT]: ctx.now,
    });

    ctx.logger.info("Closed prize draw at expiry", { productId: doc.id, revealed });
  }
}
