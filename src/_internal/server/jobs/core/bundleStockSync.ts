/**
 * Core: bundle stock sync (daily safety net).
 *
 * SB-UNI-V: bundles live on the `categories` collection with
 * categoryType:"bundle". Each bundle row owns `bundleProductIds[]` +
 * `bundleStockStatus`. This sweep recomputes `bundleStockStatus` for
 * every active bundle by inspecting its members' product status.
 */

import type { JobContext } from "../runtime/types";
import { CATEGORY_FIELDS, PRODUCT_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";

const CATEGORIES_COLLECTION = "categories";
const PRODUCT_COLLECTION = "products";
type BundleCategoryDoc = {
  bundleProductIds?: string[];
  bundleStockStatus?: "in_stock" | "out_of_stock";
};

function isMemberAvailable(data: { status?: string; isSold?: boolean; availableQuantity?: number }): boolean {
  if (data.isSold) return false;
  if (typeof data.availableQuantity === "number" && data.availableQuantity <= 0) return false;
  return data.status === PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED;
}

async function computeBundleStockStatus(
  productIds: string[],
  ctx: { db: FirebaseFirestore.Firestore },
): Promise<"in_stock" | "out_of_stock"> {
  if (productIds.length === 0) return "out_of_stock";
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const snap = await ctx.db
      .collection(PRODUCT_COLLECTION)
      .where("__name__", "in", chunk)
      .get();
    if (snap.size < chunk.length) return "out_of_stock";
    for (const doc of snap.docs) {
      const data = doc.data() as { status?: string; isSold?: boolean; availableQuantity?: number };
      if (!isMemberAvailable(data)) return "out_of_stock";
    }
  }
  return "in_stock";
}

export async function runBundleStockSync(ctx: JobContext): Promise<void> {
  ctx.logger.info("Bundle stock sync starting (SB-UNI-V categories)");

  const snap = await ctx.db
    .collection(CATEGORIES_COLLECTION)
    .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BUNDLE)
    .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
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

    const nextStatus = await computeBundleStockStatus(productIds, ctx);
    if (nextStatus !== data.bundleStockStatus) {
      await bundleDoc.ref.update({
        [CATEGORY_FIELDS.BUNDLE_STOCK_STATUS]: nextStatus,
        [CATEGORY_FIELDS.BUNDLE_QUERY_RESOLVED_AT]: ctx.now,
        [COMMON_FIELDS.UPDATED_AT]: ctx.now,
      });
      updated++;
    }
  }
  ctx.logger.info("Bundle stock sync complete", {
    scanned: snap.size,
    updated,
  });
}
