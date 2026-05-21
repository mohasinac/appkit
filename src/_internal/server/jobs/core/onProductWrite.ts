/**
 * Core: keep category metrics + store stats in sync when a product document
 * is written. Only published products count.
 */

import {
  categoriesRepository,
  storeRepository,
} from "../../../../repositories";
import { ProductStatusValues } from "../../../../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import type { JobContext } from "../runtime/types";

export type ProductDoc = Record<string, unknown>;

const UNAVAILABLE_PRODUCT_STATUSES = new Set<string>([
  ProductStatusValues.ARCHIVED,
]);

void UNAVAILABLE_PRODUCT_STATUSES;

async function getParentIds(categoryId: string): Promise<string[]> {
  if (!categoryId) return [];
  return (await categoriesRepository.findById(categoryId))?.parentIds ?? [];
}

interface DispatchInput {
  productId: string;
  beforeCategory: string | null;
  afterCategory: string | null;
  beforeStoreId: string | null;
  afterStoreId: string | null;
  isAuction: boolean;
  beforeIsAuction: boolean;
  wasPublished: boolean;
  isPublished: boolean;
  isDelete: boolean;
  ctx: JobContext;
}

async function dispatchProductWriteEvent(p: DispatchInput): Promise<void> {
  const { productId, beforeCategory, afterCategory, beforeStoreId, afterStoreId,
    isAuction, beforeIsAuction, wasPublished, isPublished, isDelete, ctx } = p;

  if (isDelete && wasPublished && beforeCategory) {
    const parentIds = await getParentIds(beforeCategory);
    const batch = ctx.db.batch();
    categoriesRepository.updateMetricsInBatch(batch, beforeCategory, parentIds,
      beforeIsAuction ? 0 : -1, beforeIsAuction ? -1 : 0, productId);
    await batch.commit();
    if (beforeStoreId) await storeRepository.incrementTotalProducts(beforeStoreId, -1);
    ctx.logger.info("Decremented counters on hard-delete", { productId, category: beforeCategory, storeId: beforeStoreId });
    return;
  }

  if (!wasPublished && isPublished && afterCategory) {
    const parentIds = await getParentIds(afterCategory);
    const batch = ctx.db.batch();
    categoriesRepository.updateMetricsInBatch(batch, afterCategory, parentIds,
      isAuction ? 0 : 1, isAuction ? 1 : 0, productId);
    await batch.commit();
    if (afterStoreId) await storeRepository.incrementTotalProducts(afterStoreId, 1);
    ctx.logger.info("Incremented counters on publish", { productId, category: afterCategory, storeId: afterStoreId });
    return;
  }

  if (wasPublished && !isPublished && beforeCategory) {
    const parentIds = await getParentIds(beforeCategory);
    const batch = ctx.db.batch();
    categoriesRepository.updateMetricsInBatch(batch, beforeCategory, parentIds,
      beforeIsAuction ? 0 : -1, beforeIsAuction ? -1 : 0, productId);
    await batch.commit();
    if (beforeStoreId) await storeRepository.incrementTotalProducts(beforeStoreId, -1);
    ctx.logger.info("Decremented counters on unpublish", { productId, category: beforeCategory, storeId: beforeStoreId });
    return;
  }

  if (wasPublished && isPublished && beforeCategory && afterCategory && beforeCategory !== afterCategory) {
    const [beforeParents, afterParents] = await Promise.all([
      getParentIds(beforeCategory),
      getParentIds(afterCategory),
    ]);
    const batch = ctx.db.batch();
    categoriesRepository.updateMetricsInBatch(batch, beforeCategory, beforeParents,
      beforeIsAuction ? 0 : -1, beforeIsAuction ? -1 : 0, productId);
    categoriesRepository.updateMetricsInBatch(batch, afterCategory, afterParents,
      isAuction ? 0 : 1, isAuction ? 1 : 0, productId);
    await batch.commit();
    ctx.logger.info("Moved product between categories", { productId, from: beforeCategory, to: afterCategory });
  }
}

export interface HandleProductWriteInput {
  productId: string;
  before: ProductDoc | null;
  after: ProductDoc | null;
}

export async function handleProductWrite(
  input: HandleProductWriteInput,
  ctx: JobContext,
): Promise<void> {
  const { productId, before, after } = input;

  const beforeStatus = (before?.status as string | undefined) ?? null;
  const afterStatus = (after?.status as string | undefined) ?? null;
  const beforeCategory = (before?.category as string | undefined) ?? null;
  const afterCategory = (after?.category as string | undefined) ?? null;
  const beforeStoreId =
    ((before?.storeId as string | undefined) || (before?.sellerId as string | undefined)) ?? null;
  const afterStoreId =
    ((after?.storeId as string | undefined) || (after?.sellerId as string | undefined)) ?? null;
  const isAuction = (after?.listingType as string | undefined) === PRODUCT_FIELDS.LISTING_TYPE_VALUES.AUCTION;
  const beforeIsAuction = (before?.listingType as string | undefined) === PRODUCT_FIELDS.LISTING_TYPE_VALUES.AUCTION;

  const wasPublished = beforeStatus === ProductStatusValues.PUBLISHED;
  const isPublished = afterStatus === ProductStatusValues.PUBLISHED;
  const isDelete = !after;

  try {
    await dispatchProductWriteEvent({
      productId, beforeCategory, afterCategory, beforeStoreId, afterStoreId,
      isAuction, beforeIsAuction, wasPublished, isPublished, isDelete, ctx,
    });
  } catch (err) {
    ctx.logger.error("Counter update failed (non-fatal)", err, { productId });
  }
}
