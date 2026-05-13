/**
 * Trigger handler: keep category metrics + store stats in sync when a
 * product document is written. Only published products count.
 */

import {
  bundlesRepository,
  categoriesRepository,
  storeRepository,
} from "../../../../repositories";
import { ProductStatusValues } from "../../../../features/products/schemas/firestore";
import type { FirestoreTriggerHandler, JobContext } from "../runtime/types";

type ProductDoc = Record<string, unknown>;

const UNAVAILABLE_PRODUCT_STATUSES = new Set<string>([
  ProductStatusValues.SOLD,
  ProductStatusValues.OUT_OF_STOCK,
  ProductStatusValues.DISCONTINUED,
]);

/**
 * SB1-H bundle stock-sync — runs in the onProductWrite trigger so any path
 * that flips a product to `sold` / `out_of_stock` / `discontinued`
 * (admin tools, scripts, order-side stock-decrement that bottoms out at
 * `availableQuantity === 0`) propagates the `isSold` flag to every bundle
 * that lists the product in `partOfBundleIds[]`.
 */
async function syncBundlesOnUnavailableTransition(
  productId: string,
  before: ProductDoc | null,
  after: ProductDoc | null,
  ctx: JobContext,
): Promise<void> {
  const beforeStatus = (before?.status as string | undefined) ?? null;
  const afterStatus = (after?.status as string | undefined) ?? null;
  const isDelete = !after;

  const becameUnavailable = !isDelete
    && afterStatus !== null
    && UNAVAILABLE_PRODUCT_STATUSES.has(afterStatus)
    && beforeStatus !== afterStatus;
  if (!becameUnavailable && !isDelete) return;

  const bundleIds =
    ((after?.partOfBundleIds as string[] | undefined)
      ?? (before?.partOfBundleIds as string[] | undefined)
      ?? []);
  if (bundleIds.length === 0) return;

  await Promise.all(
    bundleIds.map((bundleId) =>
      bundlesRepository
        .markItemSold(bundleId, productId)
        .catch((err) =>
          ctx.logger.warn("Bundle stock-sync failed (non-critical)", {
            err,
            bundleId,
            productId,
          }),
        ),
    ),
  );
  ctx.logger.info("Bundle stock-sync done", {
    productId,
    bundleCount: bundleIds.length,
  });
}

async function getParentIds(categoryId: string): Promise<string[]> {
  if (!categoryId) return [];
  return (await categoriesRepository.findById(categoryId))?.parentIds ?? [];
}

export const onProductWriteHandler: FirestoreTriggerHandler<ProductDoc, ProductDoc> = async (
  event,
  ctx: JobContext,
) => {
  const productId = event.params.productId as string;
  const before = event.before;
  const after = event.after;

  const beforeStatus = (before?.status as string | undefined) ?? null;
  const afterStatus = (after?.status as string | undefined) ?? null;
  const beforeCategory = (before?.category as string | undefined) ?? null;
  const afterCategory = (after?.category as string | undefined) ?? null;
  const beforeStoreId =
    ((before?.storeId as string | undefined) || (before?.sellerId as string | undefined)) ?? null;
  const afterStoreId =
    ((after?.storeId as string | undefined) || (after?.sellerId as string | undefined)) ?? null;
  // SB1-G — counters drive product-vs-auction split off the canonical
  // listingType discriminator. Anything not "auction" counts toward products.
  const isAuction = (after?.listingType as string | undefined) === "auction";
  const beforeIsAuction = (before?.listingType as string | undefined) === "auction";

  const wasPublished = beforeStatus === ProductStatusValues.PUBLISHED;
  const isPublished = afterStatus === ProductStatusValues.PUBLISHED;
  const isDelete = !after;

  try {
    if (isDelete && wasPublished && beforeCategory) {
      const parentIds = await getParentIds(beforeCategory);
      const batch = ctx.db.batch();
      categoriesRepository.updateMetricsInBatch(
        batch,
        beforeCategory,
        parentIds,
        beforeIsAuction ? 0 : -1,
        beforeIsAuction ? -1 : 0,
        productId,
      );
      await batch.commit();
      if (beforeStoreId) await storeRepository.incrementTotalProducts(beforeStoreId, -1);
      ctx.logger.info("Decremented counters on hard-delete", {
        productId,
        category: beforeCategory,
        storeId: beforeStoreId,
      });
    } else if (!wasPublished && isPublished && afterCategory) {
      const parentIds = await getParentIds(afterCategory);
      const batch = ctx.db.batch();
      categoriesRepository.updateMetricsInBatch(
        batch,
        afterCategory,
        parentIds,
        isAuction ? 0 : 1,
        isAuction ? 1 : 0,
        productId,
      );
      await batch.commit();
      if (afterStoreId) await storeRepository.incrementTotalProducts(afterStoreId, 1);
      ctx.logger.info("Incremented counters on publish", {
        productId,
        category: afterCategory,
        storeId: afterStoreId,
      });
    } else if (wasPublished && !isPublished && beforeCategory) {
      const parentIds = await getParentIds(beforeCategory);
      const batch = ctx.db.batch();
      categoriesRepository.updateMetricsInBatch(
        batch,
        beforeCategory,
        parentIds,
        beforeIsAuction ? 0 : -1,
        beforeIsAuction ? -1 : 0,
        productId,
      );
      await batch.commit();
      if (beforeStoreId) await storeRepository.incrementTotalProducts(beforeStoreId, -1);
      ctx.logger.info("Decremented counters on unpublish", {
        productId,
        category: beforeCategory,
        storeId: beforeStoreId,
      });
    } else if (
      wasPublished &&
      isPublished &&
      beforeCategory &&
      afterCategory &&
      beforeCategory !== afterCategory
    ) {
      const [beforeParents, afterParents] = await Promise.all([
        getParentIds(beforeCategory),
        getParentIds(afterCategory),
      ]);
      const batch = ctx.db.batch();
      categoriesRepository.updateMetricsInBatch(
        batch,
        beforeCategory,
        beforeParents,
        beforeIsAuction ? 0 : -1,
        beforeIsAuction ? -1 : 0,
        productId,
      );
      categoriesRepository.updateMetricsInBatch(
        batch,
        afterCategory,
        afterParents,
        isAuction ? 0 : 1,
        isAuction ? 1 : 0,
        productId,
      );
      await batch.commit();
      ctx.logger.info("Moved product between categories", {
        productId,
        from: beforeCategory,
        to: afterCategory,
      });
    }
  } catch (err) {
    ctx.logger.error("Counter update failed (non-fatal)", err, { productId });
  }

  try {
    await syncBundlesOnUnavailableTransition(productId, before, after, ctx);
  } catch (err) {
    ctx.logger.error("Bundle stock-sync failed (non-fatal)", err, { productId });
  }
};
