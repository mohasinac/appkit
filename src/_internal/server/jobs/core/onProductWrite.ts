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
import { isListingRowAvailable } from "../../../shared/listing-types/_registry";
import { notifyRevalidate, productCacheFieldsChanged } from "./revalidateNotify";
import type { JobContext } from "../runtime/types";

export type ProductDoc = Record<string, JsonValue>;

const UNAVAILABLE_PRODUCT_STATUSES = new Set<string>([
  ProductStatusValues.ARCHIVED,
]);

void UNAVAILABLE_PRODUCT_STATUSES;

/**
 * I3 — the ASSIGNED categories, where `own` moves.
 *
 * 🛑 The selection order must stay byte-identical to `describeCountable` and to
 * `countersReconcile.tallyProduct`. All three read the same two fields in the
 * same order, and if any one of them disagreed the nightly recount would
 * "correct" a live count that was right — drift that is invisible precisely
 * because the job overwrites rather than compares.
 */
function getEffectiveCategories(doc: ProductDoc | null): string[] {
  if (!doc) return [];
  const ids = doc.categoryIds as string[] | undefined;
  if (Array.isArray(ids) && ids.length > 0) return ids.filter(Boolean);
  const categorySlugs = doc.categorySlugs as string[] | undefined;
  if (Array.isArray(categorySlugs) && categorySlugs.length > 0) {
    return [categorySlugs[0]!].filter(Boolean);
  }
  const scalar = doc.category as string | undefined;
  return scalar ? [scalar] : [];
}

/**
 * Each assignment paired with its ancestor chain, read from the LIVE tree.
 *
 * 🛑 From the category documents, never from the product's stored closure —
 * that is what makes a reparent self-heal here as well as in the nightly job.
 * One read per assignment, in parallel, and at most
 * `MAX_CATEGORY_ASSIGNMENTS` of them.
 */
async function withParents(
  categoryIds: string[],
): Promise<Array<{ id: string; parentIds: string[] }>> {
  if (categoryIds.length === 0) return [];
  return Promise.all(
    categoryIds.map(async (id) => ({
      id,
      parentIds: (await categoriesRepository.findById(id))?.parentIds ?? [],
    })),
  );
}

/** True when the two assignment lists differ as SETS, not as ordered arrays. */
function assignmentsMoved(before: string[], after: string[]): boolean {
  if (before.length !== after.length) return true;
  const a = new Set(after);
  return before.some((id) => !a.has(id));
}

interface DispatchInput {
  productId: string;
  beforeCategories: string[];
  afterCategories: string[];
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
  const { productId, beforeCategories, afterCategories, beforeBrand, afterBrand,
    beforeStoreId, afterStoreId,
    isAuction, beforeIsAuction, wasPublished, isPublished, isDelete, ctx } = p;

  /** Stage every assignment (and, if given, one brand) at `sign` x 1 item. */
  const stage = (
    batch: FirebaseFirestore.WriteBatch,
    assignments: Array<{ id: string; parentIds: string[] }>,
    brandId: string | null,
    auction: boolean,
    sign: 1 | -1,
  ): void => {
    const productDelta = auction ? 0 : sign;
    const auctionDelta = auction ? sign : 0;
    if (assignments.length === 0 && !brandId) return;
    /*
     * ONE call, which aggregates per document id — see
     * `updateMetricsForAssignmentsInBatch`. Looping the single-category version
     * instead would stage two writes on a shared ancestor, and Firestore
     * rejects a batch containing two writes to the same document, losing every
     * increment in it rather than just the duplicate.
     */
    categoriesRepository.updateMetricsForAssignmentsInBatch(
      batch, assignments, productDelta, auctionDelta, productId, brandId,
    );
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

  if (isDelete && wasPublished && (beforeCategories.length > 0 || beforeBrand)) {
    const batch = ctx.db.batch();
    stage(batch, await withParents(beforeCategories), beforeBrand, beforeIsAuction, -1);
    await commit(batch, "Decremented counters on hard-delete", { categories: beforeCategories, brand: beforeBrand, storeId: beforeStoreId });
    if (beforeStoreId) await storeRepository.incrementTotalProducts(beforeStoreId, -1);
    return;
  }

  if (!wasPublished && isPublished && (afterCategories.length > 0 || afterBrand)) {
    const batch = ctx.db.batch();
    stage(batch, await withParents(afterCategories), afterBrand, isAuction, 1);
    await commit(batch, "Incremented counters on publish", { categories: afterCategories, brand: afterBrand, storeId: afterStoreId });
    if (afterStoreId) await storeRepository.incrementTotalProducts(afterStoreId, 1);
    return;
  }

  if (wasPublished && !isPublished && (beforeCategories.length > 0 || beforeBrand)) {
    const batch = ctx.db.batch();
    stage(batch, await withParents(beforeCategories), beforeBrand, beforeIsAuction, -1);
    await commit(batch, "Decremented counters on unpublish", { categories: beforeCategories, brand: beforeBrand, storeId: beforeStoreId });
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
    const categoryMoved = assignmentsMoved(beforeCategories, afterCategories);
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
      const productDelta = isAuction ? -1 : 1;
      const auctionDelta = isAuction ? 1 : -1;
      const batch = ctx.db.batch();
      categoriesRepository.updateMetricsForAssignmentsInBatch(
        batch, await withParents(afterCategories), productDelta, auctionDelta, productId, afterBrand,
      );
      await commit(batch, "Listing type changed", {
        productId,
        from: beforeIsAuction ? "auction" : "product",
        to: isAuction ? "auction" : "product",
      });
      return;
    }

    const [beforeParents, afterParents] = await Promise.all([
      withParents(categoryMoved ? beforeCategories : []),
      withParents(categoryMoved ? afterCategories : []),
    ]);
    /*
     * TWO BATCHES, not one, and this is the I3 change that matters most.
     *
     * The -1 and the +1 both touch the rows that did NOT move: a listing
     * re-filed from one leaf to a sibling shares every ancestor above them, and
     * a product gaining a SECOND assignment keeps its first one entirely. In
     * one batch those are two writes to the same document, which Firestore
     * rejects outright — so the whole re-file would throw and BOTH counters
     * would be left wrong.
     *
     * It worked before only because a single assignment's -1 and +1 were staged
     * with ids that happened to be disjoint whenever the branch ran at all.
     *
     * Sequential commits are not atomic together: a crash between them leaves
     * the decrement applied and the increment missing. That is the right trade,
     * because it is self-healing — `countersReconcile` rewrites from scratch
     * nightly and reports it as `drifted` — whereas a rejected batch is silent.
     */
    const outBatch = ctx.db.batch();
    stage(outBatch, beforeParents, brandMoved ? beforeBrand : null, beforeIsAuction, -1);
    await outBatch.commit();
    const batch = ctx.db.batch();
    stage(batch, afterParents, brandMoved ? afterBrand : null, isAuction, 1);
    await commit(batch, "Re-filed product", {
      fromCategories: categoryMoved ? beforeCategories : undefined,
      toCategories: categoryMoved ? afterCategories : undefined,
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

  /*
   * Drop the ISR entries for every page that renders this product.
   *
   * Deliberately folded into THIS handler rather than given a trigger of its
   * own. `products/{productId}` already carries two `documentWritten` triggers;
   * a third would add a whole function's worth of invocations for one `fetch`,
   * and Root Cause #92's collateral is the standing warning about what happens
   * when several functions share one hot path.
   *
   * Gated on a real content change so a stock decrement invalidates and an
   * `updatedAt` bump does not. Awaited — not fire-and-forget — because a Cloud
   * Function may be frozen the moment its promise settles, and a detached fetch
   * would be cancelled mid-flight often enough to make invalidation unreliable
   * without ever reporting a failure.
   */
  if (productCacheFieldsChanged(before, after)) {
    const doc = after ?? before;
    await notifyRevalidate(
      {
        collection: "products",
        id: productId,
        hints: {
          listingType: doc?.listingType as string | undefined,
          categorySlugs: Array.isArray(doc?.categorySlugs)
            ? (doc!.categorySlugs as string[])
            : undefined,
          brandSlug: doc?.brandSlug as string | undefined,
          storeId: doc?.storeId as string | undefined,
        },
      },
      ctx,
    );
  }

  const beforeStatus = (before?.status as string | undefined) ?? null;
  const afterStatus = (after?.status as string | undefined) ?? null;
  // `category` is @deprecated in favor of `categorySlugs[]` — the repository's
  // mapDoc() normalizes this on read, but a raw trigger snapshot bypasses that,
  // so a product written via categorySlugs-only paths would otherwise silently
  // no-op category metrics here. Prefer categorySlugs[0], fall back to legacy category.
  const beforeCategories = getEffectiveCategories(before);
  const afterCategories = getEffectiveCategories(after);
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

  /*
   * 🛑 COUNTED means published AND available, because that is what the listing
   * shows — and therefore what the badge must promise.
   *
   * Counting publish/unpublish alone left the badge over-promising for as long
   * as a row stayed published-but-sold: 36 of one run's failures were a tab
   * badge larger than the tab it opened. `countersReconcile` now tallies the
   * same way, and this keeps the live counter agreeing with it between nightly
   * passes instead of drifting high all day.
   *
   * It closes more of the drift than it looks like it should, because the
   * transitions that matter are all WRITES: a sale decrements stock, a refund
   * restores it, and `auctionSettlement` writes to the product when an auction
   * ends. A purely time-based expiry with no accompanying write is the only
   * residue, and the nightly recount is its healer.
   */
  const wasCounted =
    beforeStatus === ProductStatusValues.PUBLISHED &&
    !!before &&
    isListingRowAvailable(before as never, new Date());
  const isCounted =
    afterStatus === ProductStatusValues.PUBLISHED &&
    !!after &&
    isListingRowAvailable(after as never, new Date());
  const wasPublished = wasCounted;
  const isPublished = isCounted;
  const isDelete = !after;

  try {
    await dispatchProductWriteEvent({
      productId, beforeCategories, afterCategories, beforeBrand, afterBrand,
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
