/**
 * Store Query Domain Actions (appkit)
 *
 * Public and seller-facing read functions for store listings, products,
 * auctions and reviews.  No auth — callers decide whether auth is needed.
 */

import { cache } from "react";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { NotFoundError } from "../../../errors";
import { filterTestDataForViewer, filterSingleTestData, type ViewerLike } from "../../../_internal/server/features/tester/visibility";

const ERR_STORE_NOT_FOUND = "Store not found";
import { maskPublicReview } from "../../../security";
import { storeRepository } from "../repository/store.repository";
import { STORE_FIELDS } from "../schemas";
import { productRepository } from "../../products/repository/products.repository";
import { ProductStatusValues } from "../../products/schemas";
import { reviewRepository } from "../../reviews/repository/reviews.repository";
import type { StoreDocument } from "../schemas";
import type { ProductDocument } from "../../products/schemas";
import type { ReviewDocument } from "../../reviews/schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

export interface StoreQueryListParams {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface StoreContentParams {
  sorts?: string;
  page?: number;
  pageSize?: number;
  filters?: string;
}

export interface StoreReviewsResult {
  reviews: ReviewDocument[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export async function listStores(
  params: StoreQueryListParams = {},
  viewer?: ViewerLike | null,
): Promise<FirebaseSieveResult<StoreDocument>> {
  const { filters, sorts = "-createdAt", page = 1, pageSize = 24, q } = params;

  const model: SieveModel = { filters, sorts, page, pageSize };

  const filtersArr: string[] = [];
  if (q) filtersArr.push(`storeName_=${q}`);
  if (filters) filtersArr.push(filters);
  model.filters = filtersArr.join(",") || undefined;

  const result = await storeRepository.listStores(model);
  return { ...result, items: filterTestDataForViewer(result.items, viewer) };
}

/**
 * Request-scoped memo of the raw store fetch.
 *
 * CLAUDE.md § SSR Architecture requires `React.cache` on any data-fetch shared
 * by a page and its `generateMetadata`. `stores/[storeSlug]/layout.tsx` awaits
 * `getStoreBySlug` in BOTH — so every store page view was doing two identical
 * Firestore reads.
 *
 * 🛑 The cache wraps the REPOSITORY call, not `getStoreBySlug`, and that is
 * deliberate. `React.cache` memoises per argument list, and the two call sites
 * pass different arguments — `getStoreBySlug(slug)` in `generateMetadata`,
 * `getStoreBySlug(slug, viewer)` in the layout body. Wrapping the exported
 * function would produce two cache entries and dedupe nothing.
 *
 * Making them match by reading the session in `generateMetadata` would be worse
 * still: `getServerSessionUser()` is a dynamic API, and a dynamic API reached
 * from metadata opts the route out of static rendering — the exact defect that
 * made the whole site uncacheable (see `src/app/[locale]/layout.tsx`).
 *
 * So the read is cached on `storeSlug` alone and the viewer-specific
 * `filterSingleTestData` is applied outside it, per caller.
 */
const fetchStoreBySlug = cache((storeSlug: string) => storeRepository.findBySlug(storeSlug));

export async function getStoreBySlug(
  storeSlug: string,
  viewer?: ViewerLike | null,
): Promise<StoreDocument | null> {
  const store = await fetchStoreBySlug(storeSlug);
  return filterSingleTestData(store, viewer);
}

export async function getStoreProducts(
  storeSlug: string,
  params: StoreContentParams = {},
  viewer?: ViewerLike | null,
): Promise<FirebaseSieveResult<ProductDocument>> {
  const { sorts = "-createdAt", page = 1, pageSize = 24, filters } = params;

  const storeDoc = await filterSingleTestData(await storeRepository.findBySlug(storeSlug), viewer);
  if (
    !storeDoc ||
    storeDoc.status !== STORE_FIELDS.STATUS_VALUES.ACTIVE ||
    !storeDoc.isPublic
  ) {
    throw new NotFoundError(ERR_STORE_NOT_FOUND);
  }

  const filtersArr = [
    sieveFilter("storeId", SIEVE_OP.EQ, storeDoc.id),
    "status==published",
    "listingType==standard",
  ];
  if (filters) filtersArr.push(filters);

  return productRepository.list({
    filters: filtersArr.join(","),
    sorts,
    page,
    pageSize,
  });
}

export async function getStoreAuctions(
  storeSlug: string,
  params: StoreContentParams = {},
  viewer?: ViewerLike | null,
): Promise<FirebaseSieveResult<ProductDocument>> {
  const { sorts = "auctionEndDate", page = 1, pageSize = 24, filters } = params;

  const storeDoc = await filterSingleTestData(await storeRepository.findBySlug(storeSlug), viewer);
  if (
    !storeDoc ||
    storeDoc.status !== STORE_FIELDS.STATUS_VALUES.ACTIVE ||
    !storeDoc.isPublic
  ) {
    throw new NotFoundError(ERR_STORE_NOT_FOUND);
  }

  const filtersArr = [
    sieveFilter("storeId", SIEVE_OP.EQ, storeDoc.id),
    "status==published",
    "listingType==auction",
  ];
  if (filters) filtersArr.push(filters);

  return productRepository.list({
    filters: filtersArr.join(","),
    sorts,
    page,
    pageSize,
  });
}

export async function getStoreReviews(
  storeSlug: string,
): Promise<StoreReviewsResult> {
  const storeDoc = await storeRepository.findBySlug(storeSlug);
  if (
    !storeDoc ||
    storeDoc.status !== STORE_FIELDS.STATUS_VALUES.ACTIVE ||
    !storeDoc.isPublic
  ) {
    throw new NotFoundError(ERR_STORE_NOT_FOUND);
  }

  const allProducts = await productRepository.findByStore(storeDoc.id);
  const publishedProducts = allProducts
    .filter((p) => p.status === ProductStatusValues.PUBLISHED)
    .slice(0, 20);

  const reviewArrays = await Promise.all(
    publishedProducts.map((p) => reviewRepository.findApprovedByProduct(p.id, 50)),
  );

  const allReviews = reviewArrays
    .flat()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  const ratingDistribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let ratingSum = 0;

  for (const reviews of reviewArrays) {
    for (const r of reviews) {
      const rating = Math.round(r.rating);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating] = (ratingDistribution[rating] ?? 0) + 1;
        ratingSum += r.rating;
      }
    }
  }

  const totalReviews = reviewArrays.flat().length;
  const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;

  return {
    reviews: allReviews.map(maskPublicReview),
    averageRating,
    totalReviews,
    ratingDistribution,
  };
}
