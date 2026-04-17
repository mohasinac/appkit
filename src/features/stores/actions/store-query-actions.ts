/**
 * Store Query Domain Actions (appkit)
 *
 * Public and seller-facing read functions for store listings, products,
 * auctions and reviews.  No auth — callers decide whether auth is needed.
 */

import { NotFoundError } from "../../../errors";
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
): Promise<FirebaseSieveResult<StoreDocument>> {
  const { filters, sorts = "-createdAt", page = 1, pageSize = 24, q } = params;

  const model: SieveModel = { filters, sorts, page, pageSize };

  const filtersArr: string[] = [];
  if (q) filtersArr.push(`storeName_=${q}`);
  if (filters) filtersArr.push(filters);
  model.filters = filtersArr.join(",") || undefined;

  return storeRepository.listStores(model);
}

export async function getStoreBySlug(
  storeSlug: string,
): Promise<StoreDocument | null> {
  return storeRepository.findBySlug(storeSlug);
}

export async function getStoreProducts(
  storeSlug: string,
  params: StoreContentParams = {},
): Promise<FirebaseSieveResult<ProductDocument>> {
  const { sorts = "-createdAt", page = 1, pageSize = 24, filters } = params;

  const storeDoc = await storeRepository.findBySlug(storeSlug);
  if (
    !storeDoc ||
    storeDoc.status !== STORE_FIELDS.STATUS_VALUES.ACTIVE ||
    !storeDoc.isPublic
  ) {
    throw new NotFoundError("Store not found");
  }

  const filtersArr = [
    `sellerId==${storeDoc.ownerId}`,
    "status==published",
    "isAuction==false",
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
): Promise<FirebaseSieveResult<ProductDocument>> {
  const { sorts = "auctionEndDate", page = 1, pageSize = 24, filters } = params;

  const storeDoc = await storeRepository.findBySlug(storeSlug);
  if (
    !storeDoc ||
    storeDoc.status !== STORE_FIELDS.STATUS_VALUES.ACTIVE ||
    !storeDoc.isPublic
  ) {
    throw new NotFoundError("Store not found");
  }

  const filtersArr = [
    `sellerId==${storeDoc.ownerId}`,
    "status==published",
    "isAuction==true",
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
    throw new NotFoundError("Store not found");
  }

  const allProducts = await productRepository.findBySeller(storeDoc.ownerId);
  const publishedProducts = allProducts
    .filter((p) => p.status === ProductStatusValues.PUBLISHED)
    .slice(0, 20);

  const reviewArrays = await Promise.all(
    publishedProducts.map((p) => reviewRepository.findApprovedByProduct(p.id)),
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
