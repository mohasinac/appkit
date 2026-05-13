import {
  categoriesRepository,
  reviewRepository,
  storeRepository,
} from "../../../../repositories";
import { ProductStatusValues, PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import type { JobContext } from "../runtime/types";
import { QUERY_LIMIT } from "../handlers/messages";

const STORES_COLLECTION = "stores";
const ORDERS_COLLECTION = "orders";

async function reconcileCategories(ctx: JobContext): Promise<void> {
  const snap = await ctx.db
    .collection(PRODUCT_COLLECTION)
    .where("status", "==", ProductStatusValues.PUBLISHED)
    .limit(QUERY_LIMIT)
    .get();

  ctx.logger.info(`[categories] ${snap.size} published products found`);

  const leafCounts: Record<string, { productIds: string[]; auctionIds: string[] }> = {};
  for (const doc of snap.docs) {
    const data = doc.data() as { category?: string; listingType?: string };
    const catId = data.category;
    if (!catId) continue;
    if (!leafCounts[catId]) leafCounts[catId] = { productIds: [], auctionIds: [] };
    if (data.listingType === "auction") leafCounts[catId].auctionIds.push(doc.id);
    else leafCounts[catId].productIds.push(doc.id);
  }

  const ancestorAggregates: Record<string, { productDelta: number; auctionDelta: number }> = {};
  let leafUpdated = 0;
  for (const [catId, { productIds, auctionIds }] of Object.entries(leafCounts)) {
    await categoriesRepository.setMetrics(
      catId,
      productIds.length,
      auctionIds.length,
      productIds,
      auctionIds,
    );
    leafUpdated++;
    const parentIds = (await categoriesRepository.findById(catId))?.parentIds ?? [];
    for (const ancestorId of parentIds) {
      if (!ancestorAggregates[ancestorId]) {
        ancestorAggregates[ancestorId] = { productDelta: 0, auctionDelta: 0 };
      }
      ancestorAggregates[ancestorId].productDelta += productIds.length;
      ancestorAggregates[ancestorId].auctionDelta += auctionIds.length;
    }
  }

  const ancestorEntries = Object.entries(ancestorAggregates);
  for (const [ancestorId, { productDelta, auctionDelta }] of ancestorEntries) {
    await categoriesRepository.setMetrics(ancestorId, productDelta, auctionDelta, [], []);
  }

  ctx.logger.info("[categories] reconciliation complete", {
    leafCategoriesUpdated: leafUpdated,
    ancestorCategoriesUpdated: ancestorEntries.length,
  });
}

async function reconcileStores(ctx: JobContext): Promise<void> {
  const storeIds = await storeRepository.listIds();
  ctx.logger.info(`[stores] ${storeIds.length} stores found`);

  let processed = 0;
  let errors = 0;

  for (const storeId of storeIds) {
    try {
      const storeSnap = await ctx.db.collection(STORES_COLLECTION).doc(storeId).get();
      if (!storeSnap.exists) continue;
      const sellerId = (storeSnap.data() as { ownerId?: string }).ownerId;
      if (!sellerId) continue;

      const [productsSnap, ordersSnap, reviewStats] = await Promise.all([
        ctx.db
          .collection(PRODUCT_COLLECTION)
          .where("sellerId", "==", sellerId)
          .where("status", "==", ProductStatusValues.PUBLISHED)
          .limit(QUERY_LIMIT)
          .get(),
        ctx.db
          .collection(ORDERS_COLLECTION)
          .where("sellerId", "==", sellerId)
          .where("status", "==", "delivered")
          .limit(QUERY_LIMIT)
          .get(),
        reviewRepository.getApprovedRatingAggregateByStore(storeId),
      ]);

      await storeRepository.setStats(
        storeId,
        productsSnap.size,
        ordersSnap.size,
        reviewStats.count,
        reviewStats.count > 0 ? reviewStats.avgRating : null,
      );
      processed++;
    } catch (storeErr) {
      errors++;
      ctx.logger.error(`[stores] failed for store ${storeId}`, storeErr);
    }
  }

  ctx.logger.info("[stores] reconciliation complete", {
    processed,
    errors,
    total: storeIds.length,
  });
}

export async function runCountersReconcile(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting counters reconciliation (categories + stores)");
  try {
    await reconcileCategories(ctx);
  } catch (err) {
    ctx.logger.error("Category reconciliation failed", err);
  }
  try {
    await reconcileStores(ctx);
  } catch (err) {
    ctx.logger.error("Store reconciliation failed", err);
    throw err;
  }
  ctx.logger.info("Counters reconciliation complete");
}
