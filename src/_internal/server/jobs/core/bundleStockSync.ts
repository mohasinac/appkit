/**
 * Core: bundle stock sync (daily safety net).
 *
 * SB-UNI-V: bundles live on the `categories` collection with
 * categoryType:"bundle". Each bundle row owns `bundleProductIds[]` +
 * `bundleStockStatus`. This sweep recomputes `bundleStockStatus` for
 * every active bundle by inspecting its members' product status.
 */

import type { JobContext } from "../runtime/types";

const CATEGORIES_COLLECTION = "categories";
const PRODUCT_COLLECTION = "products";
const UNAVAILABLE = new Set(["sold", "out_of_stock", "discontinued"]);
const MIN_ACTIVE_DEFAULT = 1;

type BundleCategoryDoc = {
  bundleProductIds?: string[];
  bundleStockStatus?: "in_stock" | "partial" | "out_of_stock";
  minActiveMembers?: number;
};

async function computeBundleStockStatus(
  productIds: string[],
  minActive: number,
  ctx: { db: FirebaseFirestore.Firestore },
): Promise<"in_stock" | "partial" | "out_of_stock"> {
  if (productIds.length === 0) return "out_of_stock";
  let unavailable = 0;
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const snap = await ctx.db
      .collection(PRODUCT_COLLECTION)
      .where("__name__", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const status = (doc.data() as { status?: string }).status;
      if (!status || UNAVAILABLE.has(status)) unavailable++;
    }
    if (snap.size < chunk.length) unavailable += chunk.length - snap.size;
  }
  const active = productIds.length - unavailable;
  if (unavailable === 0) return "in_stock";
  if (active < minActive) return "out_of_stock";
  return "partial";
}

export async function runBundleStockSync(ctx: JobContext): Promise<void> {
  ctx.logger.info("Bundle stock sync starting (SB-UNI-V categories)");

  const snap = await ctx.db
    .collection(CATEGORIES_COLLECTION)
    .where("categoryType", "==", "bundle")
    .where("isActive", "==", true)
    .limit(500)
    .get();

  if (snap.empty) {
    ctx.logger.info("No active bundle categories to scan");
    return;
  }

  let updated = 0;
  for (const bundleDoc of snap.docs) {
    const data = bundleDoc.data() as BundleCategoryDoc;
    const productIds = data.bundleProductIds ?? [];
    if (productIds.length === 0) continue;
    const minActive = data.minActiveMembers ?? MIN_ACTIVE_DEFAULT;

    const nextStatus = await computeBundleStockStatus(productIds, minActive, ctx);
    if (nextStatus !== data.bundleStockStatus) {
      await bundleDoc.ref.update({
        bundleStockStatus: nextStatus,
        bundleQueryResolvedAt: ctx.now,
        updatedAt: ctx.now,
      });
      updated++;
    }
  }
  ctx.logger.info("Bundle stock sync complete", {
    scanned: snap.size,
    updated,
  });
}
