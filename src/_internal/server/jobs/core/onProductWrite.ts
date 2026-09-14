import { normalizeError } from "../../../../errors/normalize";
import type { JsonValue } from "@mohasinac/appkit";
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

export type ProductDoc = Record<string, JsonValue>;

const UNAVAILABLE_PRODUCT_STATUSES = new Set<string>([
  ProductStatusValues.ARCHIVED,
]);

void UNAVAILABLE_PRODUCT_STATUSES;

function getEffectiveCategory(doc: ProductDoc | null): string | null {
  if (!doc) return null;
  const categorySlugs = doc.categorySlugs as string[] | undefined;
  if (Array.isArray(categorySlugs) && categorySlugs.length > 0) return categorySlugs[0];
  return (doc.category as string | undefined) ?? null;
}

async function getParentIds(categoryId: string): Promise<string[]> {
  if (!categoryId) return [];
  return (await categoriesRepository.findById(categoryId))?.parentIds ?? [];
}

interface DispatchInput {
  productId: string;
  beforeCategory: string | null;
  afterCategory: string | null;
  beforeBrand: string | null;
  afterBrand: string | null;
  beforeStoreId: string | null;
  afterStoreId: string | null;
  isAuction: boolean;
  beforeIsAuction: boolean;
  wasPublished: boolean;
  isPublished: boolean;
  isDelete: boolean;
  ctx: JobContext;
}

/**
 * 🛑 THIS IS A CROSS-COLLECTION TRIGGER AND THAT IS THE SAFETY ARGUMENT.
 *
 * It watches `products` and writes to `categories`, so its own writes cannot
 * re-trigger it — there is no termination condition to get right, because there
 * is no cycle. Contrast `onCategoryWrite`, which DOES write its own collection
 * and is safe only because of a structural guard on `parentIds`.
 *
 * **Do not move this counting into `onCategoryWrite`.** A `categories` trigger
 * that increments a `categories` document is exactly the shape of Root Cause
 * #92 — `onShipmentHeaderWrite` recursed 1,017,548 times in 24 hours against a
 * 2M/month quota because a key-order-sensitive `JSON.stringify` guard could
 * never return true, and the only symptom was a billing page.
 *
 * Brands ride along here rather than in a second trigger: a brand IS a
 * `categoryType:"brand"` row in the same collection, so it is the same write to
 * the same place, and splitting it would double the invocations for nothing.
 * A brand has no ancestors, so it is staged with an empty parent chain and its
 * own count equals its rollup by construction.
 */
async function dispatchProductWriteEvent(p: DispatchInput): Promise<void> {
  const { productId, beforeCategory, afterCategory, beforeBrand, afterBrand,
    beforeStoreId, afterStoreId,
    isAuction, beforeIsAuction, wasPublished, isPublished, isDelete, ctx } = p;

  /** Stage one category (and, if given, one brand) at `sign` × 1 item. */
  const stage = (
    batch: FirebaseFirestore.WriteBatch,
    categoryId: string | null,
    brandId: string | null,
    parentIds: string[],
    auction: boolean,
    sign: 1 | -1,
  ): void => {
    const productDelta = auction ? 0 : sign;
    const auctionDelta = auction ? sign : 0;
    if (categoryId) {
      categoriesRepository.updateMetricsInBatch(
        batch, categoryId, parentIds, productDelta, auctionDelta, productId,
      );
    }
    if (brandId) {
      categoriesRepository.updateMetricsInBatch(
        batch, brandId, [], productDelta, auctionDelta, productId,
      );
    }
  };

  /*
   * `batch.update()` REJECTS a missing document, and a batch is atomic — so one
   * dangling ancestor id loses every increment in the batch, not just its own.
   * That throw is caught by the caller and logged non-fatally, which is correct:
   * a counter is not worth failing a product write over. What makes it
   * acceptable is that `countersReconcile` now RECOUNTS FROM SCRATCH nightly and
   * rewrites every row that disagrees, so a lost increment self-heals within a
   * day and shows up as a non-zero `drifted` in that job's log.
   */
  const commit = async (batch: FirebaseFirestore.WriteBatch, what: string, meta: object) => {
    await batch.commit();
    ctx.logger.info(what, { productId, ...meta });
  };

  if (isDelete && wasPublished && (beforeCategory || beforeBrand)) {
    const batch = ctx.db.batch();
    stage(batch, beforeCategory, beforeBrand, await getParentIds(beforeCategory ?? ""), beforeIsAuction, -1);
    await commit(batch, "Decremented counters on hard-delete", { category: beforeCategory, brand: beforeBrand, storeId: beforeStoreId });
    if (beforeStoreId) await storeRepository.incrementTotalProducts(beforeStoreId, -1);
    return;
  }

  if (!wasPublished && isPublished && (afterCategory || afterBrand)) {
    const batch = ctx.db.batch();
    stage(batch, afterCategory, afterBrand, await getParentIds(afterCategory ?? ""), isAuction, 1);
    await commit(batch, "Incremented counters on publish", { category: afterCategory, brand: afterBrand, storeId: afterStoreId });
    if (afterStoreId) await storeRepository.incrementTotalProducts(afterStoreId, 1);
    return;
  }

  if (wasPublished && !isPublished && (beforeCategory || beforeBrand)) {
    const batch = ctx.db.batch();
    stage(batch, beforeCategory, beforeBrand, await getParentIds(beforeCategory ?? ""), beforeIsAuction, -1);
    await commit(batch, "Decremented counters on unpublish", { category: beforeCategory, brand: beforeBrand, storeId: beforeStoreId });
    if (beforeStoreId) await storeRepository.incrementTotalProducts(beforeStoreId, -1);
    return;
  }

  /*
   * Still published, but re-filed. This is the branch a naive trigger gets
   * wrong — incrementing the new home without decrementing the old one is how
   * a count drifts permanently upward with no event to blame it on. Category
   * and brand are tested INDEPENDENTLY because either can move without the
   * other: re-tagging the brand while the category stands still used to fall
   * through every branch and silently leave both brand rows wrong.
   */
  if (wasPublished && isPublished) {
    const categoryMoved = beforeCategory !== afterCategory;
    const brandMoved = beforeBrand !== afterBrand;
    /*
     * A listing can also change WHICH counter it belongs in without moving at
     * all: flipping listingType between auction and anything else has to move
     * the item from `auctionCount` to `productCount` on the same rows. That is
     * tested independently for the same reason category and brand are — it
     * happens on its own, and when it did, this branch returned early and left
     * the item counted as an auction forever.
     */
    const typeChanged = beforeIsAuction !== isAuction;
    if (!categoryMoved && !brandMoved && !typeChanged) return;

    /*
     * A pure type flip: nothing moved, so the item leaves one counter and joins
     * the other on the SAME rows. Staged as ONE call carrying both deltas rather
     * than a -1 followed by a +1, because those would be two writes to the same
     * document in one batch. Note the two deltas cancel, so `totalItemCount`
     * correctly does not move — the item did not come or go, it changed shape.
     */
    if (!categoryMoved && !brandMoved) {
      const parents = await getParentIds(afterCategory ?? "");
      const productDelta = isAuction ? -1 : 1;
      const auctionDelta = isAuction ? 1 : -1;
      const batch = ctx.db.batch();
      if (afterCategory) {
        categoriesRepository.updateMetricsInBatch(
          batch, afterCategory, parents, productDelta, auctionDelta, productId,
        );
      }
      if (afterBrand) {
        categoriesRepository.updateMetricsInBatch(
          batch, afterBrand, [], productDelta, auctionDelta, productId,
        );
      }
      await commit(batch, "Listing type changed", {
        productId,
        from: beforeIsAuction ? "auction" : "product",
        to: isAuction ? "auction" : "product",
      });
      return;
    }

    const [beforeParents, afterParents] = await Promise.all([
      getParentIds(categoryMoved ? beforeCategory ?? "" : ""),
      getParentIds(categoryMoved ? afterCategory ?? "" : ""),
    ]);
    const batch = ctx.db.batch();
    stage(batch, categoryMoved ? beforeCategory : null, brandMoved ? beforeBrand : null, beforeParents, beforeIsAuction, -1);
    stage(batch, categoryMoved ? afterCategory : null, brandMoved ? afterBrand : null, afterParents, isAuction, 1);
    await commit(batch, "Re-filed product", {
      fromCategory: categoryMoved ? beforeCategory : undefined,
      toCategory: categoryMoved ? afterCategory : undefined,
      fromBrand: brandMoved ? beforeBrand : undefined,
      toBrand: brandMoved ? afterBrand : undefined,
    });
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
  // `category` is @deprecated in favor of `categorySlugs[]` — the repository's
  // mapDoc() normalizes this on read, but a raw trigger snapshot bypasses that,
  // so a product written via categorySlugs-only paths would otherwise silently
  // no-op category metrics here. Prefer categorySlugs[0], fall back to legacy category.
  const beforeCategory = getEffectiveCategory(before);
  const afterCategory = getEffectiveCategory(after);
  /*
   * `brandSlug` is the brand ROW's document id in this same `categories`
   * collection. `brand` is the display NAME and is not a key — CLAUDE.md's
   * § "Brand matching is by DISPLAY NAME" — so it must never be used here.
   * Nothing had ever written a brand row's metrics, while
   * BrandDetailPageView.tsx:124 reads `brand?.metrics?.productCount` — so every
   * brand page fell through to its tab count or to a hard 0.
   */
  const beforeBrand = (before?.brandSlug as string | undefined) ?? null;
  const afterBrand = (after?.brandSlug as string | undefined) ?? null;
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
      productId, beforeCategory, afterCategory, beforeBrand, afterBrand,
      beforeStoreId, afterStoreId,
      isAuction, beforeIsAuction, wasPublished, isPublished, isDelete, ctx,
    });
  } catch (err) {
    void normalizeError(err);
    // Non-fatal on purpose — a counter must never fail a product write. The
    // healer is `countersReconcile`, which recounts from scratch nightly and
    // reports how many rows it had to correct.
    ctx.logger.error(
      "Counter update failed (non-fatal — countersReconcile will heal it tonight)",
      err,
      { productId },
    );
  }
}
