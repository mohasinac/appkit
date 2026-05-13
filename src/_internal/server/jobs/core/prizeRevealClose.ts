import type { JobContext } from "../runtime/types";

const PRODUCT_COLLECTION = "products";

export async function runPrizeRevealClose(ctx: JobContext): Promise<void> {
  ctx.logger.info("Prize reveal close sweep starting");

  const snap = await ctx.db
    .collection(PRODUCT_COLLECTION)
    .where("listingType", "==", "prize-draw")
    .where("prizeRevealStatus", "==", "open")
    .where("prizeRevealWindowEnd", "<=", ctx.now)
    .limit(100)
    .get();

  if (snap.empty) {
    ctx.logger.info("No prize draws to close");
    return;
  }

  const batch = ctx.db.batch();
  snap.docs.forEach((doc) =>
    batch.update(doc.ref, {
      prizeRevealStatus: "closed",
      updatedAt: ctx.now,
    }),
  );
  await batch.commit();

  ctx.logger.info("Closed prize draws", { count: snap.size });
}
