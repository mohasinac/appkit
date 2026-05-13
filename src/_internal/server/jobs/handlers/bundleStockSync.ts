/**
 * scheduledBundleStockSync — daily 10am IST.
 *
 * Sweeps every active bundle and flips `isSold=true` if any of its
 * referenced products are sold / out_of_stock / discontinued.
 *
 * Same logic as `onProductWriteHandler`'s reverse-ref sync, but runs as a
 * safety net for cases where the trigger missed a write (manual Firestore
 * edit, batch import, etc.).
 */

import type { ScheduleHandler } from "../runtime/types";

const BUNDLES_COLLECTION = "bundles";
const PRODUCT_COLLECTION = "products";
const UNAVAILABLE = new Set(["sold", "out_of_stock", "discontinued"]);

export const bundleStockSyncHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Bundle stock sync starting");

  const bundlesSnap = await ctx.db
    .collection(BUNDLES_COLLECTION)
    .where("isSold", "==", false)
    .limit(500)
    .get();

  if (bundlesSnap.empty) {
    ctx.logger.info("No active bundles to scan");
    return;
  }

  let flipped = 0;
  for (const bundleDoc of bundlesSnap.docs) {
    const bundle = bundleDoc.data() as {
      bundleItems?: Array<{ productId: string }>;
    };
    const productIds = (bundle.bundleItems ?? [])
      .map((it) => it.productId)
      .filter(Boolean);
    if (productIds.length === 0) continue;

    // Firestore "in" caps at 30 — batch the reads.
    let anyUnavailable = false;
    for (let i = 0; i < productIds.length && !anyUnavailable; i += 30) {
      const chunk = productIds.slice(i, i + 30);
      const productsSnap = await ctx.db
        .collection(PRODUCT_COLLECTION)
        .where("__name__", "in", chunk)
        .get();
      for (const p of productsSnap.docs) {
        const status = (p.data() as { status?: string }).status;
        if (status && UNAVAILABLE.has(status)) {
          anyUnavailable = true;
          break;
        }
      }
    }
    if (anyUnavailable) {
      await bundleDoc.ref.update({
        isSold: true,
        updatedAt: ctx.now,
      });
      flipped++;
    }
  }
  ctx.logger.info("Bundle stock sync complete", {
    scanned: bundlesSnap.size,
    flipped,
  });
};
