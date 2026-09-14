import { normalizeError } from "../../../../errors/normalize";
import {
  categoriesRepository,
  reviewRepository,
  storeRepository,
} from "../../../../repositories";
import { ProductStatusValues, PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import { CATEGORIES_COLLECTION } from "../../../../features/categories/schemas/firestore";
import { ORDER_FIELDS, PRODUCT_FIELDS } from "../../../../constants/field-names";
import type { JobContext } from "../runtime/types";
import { QUERY_LIMIT } from "../handlers/messages";

const STORES_COLLECTION = "stores";
const ORDERS_COLLECTION = "orders";
/** Page size for the products scan. Bounded reads, unbounded total coverage. */
const PAGE_SIZE = 500;

interface Tally {
  productIds: string[];
  auctionIds: string[];
  totalProducts: number;
  totalAuctions: number;
}

const emptyTally = (): Tally => ({
  productIds: [],
  auctionIds: [],
  totalProducts: 0,
  totalAuctions: 0,
});

/** Filed DIRECTLY under this row — `metrics.productCount` / `auctionCount`. */
function countOwn(t: Tally, productId: string, isAuction: boolean): void {
  if (isAuction) t.auctionIds.push(productId);
  else t.productIds.push(productId);
}

/** This row or any ancestor — `metrics.totalProductCount` / `totalAuctionCount`. */
function countRollup(t: Tally | undefined, isAuction: boolean): void {
  if (!t) return;
  if (isAuction) t.totalAuctions++;
  else t.totalProducts++;
}

interface ProductTallyRow {
  category?: string;
  categorySlugs?: string[];
  brandSlug?: string;
  listingType?: string;
}

/**
 * Fold one published product into the tallies.
 *
 * A named function rather than an inner block: this is the only place the
 * own-vs-rollup distinction is actually APPLIED, and burying it four levels deep
 * inside a paginating loop is how it stopped being visible last time.
 * Returns true when the product names a category nothing recognises.
 */
function tallyProduct(
  productId: string,
  data: ProductTallyRow,
  tallies: Map<string, Tally>,
  parentsOf: Map<string, string[]>,
): boolean {
  const isAuction =
    data.listingType === PRODUCT_FIELDS.LISTING_TYPE_VALUES.AUCTION;

  // `category` is @deprecated in favour of `categorySlugs[]`; mirror the live
  // trigger's selection exactly so the two agree (onProductWrite.ts).
  const leaf =
    (Array.isArray(data.categorySlugs) && data.categorySlugs[0]) ||
    data.category ||
    null;

  let unknown = false;
  if (leaf && !tallies.has(leaf)) {
    unknown = true;
  } else if (leaf) {
    countOwn(tallies.get(leaf)!, productId, isAuction);
    // Roll up through self + every ancestor. `parentIds` already holds the
    // WHOLE chain, so this is one pass rather than a walk.
    for (const id of [leaf, ...(parentsOf.get(leaf) ?? [])]) {
      countRollup(tallies.get(id), isAuction);
    }
  }

  // Brands are a flat dimension: a brand row has no product children of its own
  // beyond what points at it, so own === total by construction — which is why
  // it is counted on both axes at once.
  if (data.brandSlug && tallies.has(data.brandSlug)) {
    countOwn(tallies.get(data.brandSlug)!, productId, isAuction);
    countRollup(tallies.get(data.brandSlug), isAuction);
  }
  return unknown;
}

/**
 * Recount every category and brand row from the products collection.
 *
 * 🛑 THREE THINGS THIS HAS TO GET RIGHT, each of which the previous version
 * got wrong, and none of which produced an error:
 *
 * 1. **Own vs rollup are different numbers.** `metrics.productCount` is what is
 *    filed directly under a row; `metrics.totalProductCount` is that plus every
 *    descendant. The old code passed one number for both — see `setMetrics`'s
 *    header for the full account and the 19-of-65 measurement.
 *
 * 2. **Every row is written, including the ones that are now empty.** The old
 *    code built its map from products that EXIST, so a category whose last item
 *    was deleted was never visited and kept its stale count forever. Seeding
 *    `tallies` from the category list instead of from the products is the whole
 *    fix, and it is why the loop below walks `parentsOf` rather than `tallies`
 *    entries.
 *
 * 3. **Brands are counted too.** Brands are `categoryType:"brand"` rows in this
 *    same collection and `BrandDetailPageView` reads `metrics.productCount` off
 *    them — but nothing has ever written it. They hang off `brandSlug`, not off
 *    the category chain, so they get their own pass.
 *
 * Reads are bounded by pagination rather than by `.limit(QUERY_LIMIT)`, which
 * silently recounted a subset the moment the catalogue passed 1,000 published
 * rows — a truncated recount is indistinguishable from a correct one.
 *
 * 🛑 THIS IS THE ONLY RECOUNT. `appkit/scripts/backfill-category-metrics.mjs`
 * was a second implementation of exactly this, reachable as
 * `npm run categories:backfill-metrics`, and it was wrong four ways: it wrote the
 * descendant rollup into `productCount` (the own count — Root Cause 102, the bug
 * this file's own/rollup split exists to fix), blanked `productIds` on every
 * ancestor, enumerated only categories that HAVE products so a row that dropped
 * to zero kept its stale count, and — worst — wrote any row that was both a leaf
 * with products AND an ancestor twice, the ancestor pass silently overwriting its
 * own count. It was deleted 2026-09-14 rather than repaired: a second recount
 * that disagrees with this one is a way to *introduce* drift while believing you
 * are fixing it. If a manual run is ever needed, invoke this job — do not write
 * another script.
 *
 * As of 2026-09-14 this is a BACKSTOP, not the maintainer. `onProductWrite`
 * (products → categories) and `CategoriesRepository.reparentSubtree`
 * (structural moves + deletes) keep the counters correct in real time; this pass
 * exists because a `batch.update()` against a dangling ancestor id throws and
 * loses every increment in that batch. A non-zero `drifted` in its log is
 * therefore a real signal that one of those paths missed something — it is not
 * routine.
 */
async function reconcileCategories(ctx: JobContext): Promise<void> {
  // Every category row, so rows that dropped to zero are still reset.
  const catSnap = await ctx.db.collection(CATEGORIES_COLLECTION).get();
  const parentsOf = new Map<string, string[]>();
  for (const d of catSnap.docs) {
    parentsOf.set(d.id, (d.data() as { parentIds?: string[] }).parentIds ?? []);
  }

  const tallies = new Map<string, Tally>();
  for (const id of parentsOf.keys()) tallies.set(id, emptyTally());

  let scanned = 0;
  let unknownCategory = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = ctx.db
      .collection(PRODUCT_COLLECTION)
      .where(ORDER_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED)
      .orderBy("__name__")
      .limit(PAGE_SIZE);
    if (cursor) q = q.startAfter(cursor);
    const page = await q.get();
    if (page.empty) break;

    for (const doc of page.docs) {
      scanned++;
      if (tallyProduct(doc.id, doc.data() as ProductTallyRow, tallies, parentsOf)) {
        unknownCategory++;
      }
    }

    cursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }

  let written = 0;
  let drifted = 0;
  for (const doc of catSnap.docs) {
    const t = tallies.get(doc.id) ?? emptyTally();
    const m = (doc.data() as { metrics?: Record<string, number> }).metrics ?? {};
    const same =
      (m.productCount ?? 0) === t.productIds.length &&
      (m.auctionCount ?? 0) === t.auctionIds.length &&
      (m.totalProductCount ?? 0) === t.totalProducts &&
      (m.totalAuctionCount ?? 0) === t.totalAuctions;
    // Skipping no-op writes keeps a 65-row nightly pass near-free against the
    // 20k/day write budget — and makes `drifted` a real signal rather than a
    // count of how many rows exist. A non-zero `drifted` on a quiet day means
    // the live trigger missed something.
    if (same) continue;
    drifted++;
    try {
      await categoriesRepository.setMetrics(doc.id, {
        productCount: t.productIds.length,
        auctionCount: t.auctionIds.length,
        totalProductCount: t.totalProducts,
        totalAuctionCount: t.totalAuctions,
        productIds: t.productIds,
        auctionIds: t.auctionIds,
      });
      written++;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error(`[categories] setMetrics failed for ${doc.id}`, err);
    }
  }

  ctx.logger.info("[categories] reconciliation complete", {
    categoryRows: catSnap.size,
    publishedProductsScanned: scanned,
    drifted,
    written,
    unknownCategory,
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
          .where(ORDER_FIELDS.SELLER_ID, "==", sellerId)
          .where(ORDER_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED)
          .limit(QUERY_LIMIT)
          .get(),
        ctx.db
          .collection(ORDERS_COLLECTION)
          .where(ORDER_FIELDS.SELLER_ID, "==", sellerId)
          .where(ORDER_FIELDS.STATUS, "==", ORDER_FIELDS.STATUS_VALUES.DELIVERED)
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
      void normalizeError(storeErr);
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
  } catch (err: unknown) {
    void normalizeError(err);
    ctx.logger.error("Category reconciliation failed", err);
  }
  try {
    await reconcileStores(ctx);
  } catch (err: unknown) {
    ctx.logger.error("Store reconciliation failed", err);
    throw err;
  }
  ctx.logger.info("Counters reconciliation complete");
}
