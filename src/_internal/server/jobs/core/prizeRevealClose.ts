import type { JobContext } from "../runtime/types";
import { PRODUCT_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";

const PRODUCT_COLLECTION = "products";
const PRIZE_DRAW_LISTING_TYPE = "prize-draw";

export async function runPrizeRevealClose(ctx: JobContext): Promise<void> {
  ctx.logger.info("Prize reveal close sweep starting");

  const snap = await ctx.db
    .collection(PRODUCT_COLLECTION)
    .where(PRODUCT_FIELDS.LISTING_TYPE, "==", PRIZE_DRAW_LISTING_TYPE)
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_STATUS, "==", PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.OPEN)
    .where(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_END, "<=", ctx.now)
    .limit(100)
    .get();

  if (snap.empty) {
    ctx.logger.info("No prize draws to close");
    return;
  }

  const batch = ctx.db.batch();
  snap.docs.forEach((doc) =>
    batch.update(doc.ref, {
      [PRODUCT_FIELDS.PRIZE_REVEAL_STATUS]: PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.CLOSED,
      [COMMON_FIELDS.UPDATED_AT]: ctx.now,
    }),
  );
  await batch.commit();

  ctx.logger.info("Closed prize draws", { count: snap.size });
}
