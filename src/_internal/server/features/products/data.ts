import { cache } from "react";
// Imported (not just re-exported) because this module calls it internally.
// It lives in _internal/shared so `"use client"` components can import it
// without dragging this file's firebase-admin chain into the client bundle.
import { toProductItem } from "../../../shared/features/products/to-product-item";
export { toProductItem };
import { productRepository } from "../../../../repositories";
import { reviewRepository } from "../../../../repositories";
import { getAdminDb } from "../../../../providers/db-firebase";
import { normalizeError } from "../../../../errors/normalize";
import { safeRead } from "../../../../errors/safe-read";
import { serverLogger } from "../../../../monitoring/server-logger";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { PRODUCTS_SITEMAP_LIMIT } from "../../../shared/features/products/config";
import { isListingRowAvailable } from "../../../shared/listing-types/_registry";
import { isPubliclyVisible } from "../../../shared/listing-types/availability";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import type { ListingType } from "../../../../features/products/types";
import type { ProductItem } from "../../../../features/products/types";
import type { FirestoreDocument } from "../../../../schemas/types";
import { SIEVE_OP, sieveAnd, sieveFilter, sortBy } from "../../../../utils/sieve-builder";
import type { Review, ReviewListResponse } from "../../../../features/reviews/types";
import { REVIEW_FIELDS } from "../../../../constants/field-names";
import { REVIEWS_DETAIL_PAGE_SIZE } from "../../../shared/features/reviews/config";

// ---------------------------------------------------------------------------
// Request-scoped cache — each function is deduplicated per RSC render tree.
// Both generateMetadata() and the page component get the same promise.
// ---------------------------------------------------------------------------

/** Fetch a single product by slug or id, deduped per request. */
export const getProductForDetail = cache(
  async (slugOrId: string): Promise<ProductDocument | null> => {
    /*
     * 🛑 No view-count write here — deleted 2026-08-31.
     *
     * This fired `incrementViewCount` on every render, which was two defects at
     * once. It is a Firestore WRITE on the render path (Rule #6), and product
     * and category detail were being counted TWICE by two systems that key
     * differently: this one on the document by id, and the client
     * `PageViewTracker` into `pageViews` by slug. They can never reconcile —
     * they disagree on bots, on prefetch, and on JS-disabled clients — so the
     * two numbers were guaranteed to drift and neither could be trusted.
     *
     * `pageViews` is the single counter now. `viewCount` on the document stays
     * for historical rows; nothing increments it.
     */
    return (await productRepository.findByIdOrSlug(slugOrId)) ?? null;
  },
);

/** Fetch the first page of approved reviews for a product, deduped per request. */
export const getReviewsForProduct = cache(
  async (productId: string, limit = REVIEWS_DETAIL_PAGE_SIZE): Promise<unknown[]> => {
    return safeRead(() => reviewRepository.findApprovedByProduct(productId, limit), {
      route: "/products",
      key: "products.getReviewsForProduct",
      fallback: [],
    });
  },
);

/** Firestore review doc → client Review shape. Shared by every listing-type detail page's reviews tab. */
export function toReview(doc: FirestoreDocument): Review {
  const images = Array.isArray(doc.images) ? (doc.images as string[]) : undefined;
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : typeof doc.createdAt === "string"
        ? doc.createdAt
        : undefined;
  const rawRating = typeof doc.rating === "number" ? doc.rating : 3;
  const rating = Math.min(5, Math.max(1, Math.round(rawRating))) as 1 | 2 | 3 | 4 | 5;

  return {
    id: String(doc.id ?? ""),
    productId: String(doc.productId ?? ""),
    userId: String(doc.userId ?? ""),
    userName: String(doc.userName ?? "Anonymous"),
    userAvatar: typeof doc.userAvatar === "string" ? doc.userAvatar : undefined,
    rating,
    title: typeof doc.title === "string" ? doc.title : undefined,
    comment: typeof doc.comment === "string" ? doc.comment : undefined,
    images,
    status: (doc.status as Review["status"]) ?? "approved",
    helpfulCount: typeof doc.helpfulCount === "number" ? doc.helpfulCount : undefined,
    verified: doc.verified === true,
    featured: doc.featured === true,
    createdAt,
  };
}

/** Fetch + map approved reviews for a product straight to the client Review shape, deduped per request. */
export const getReviewItemsForProduct = cache(
  async (productId: string, limit = REVIEWS_DETAIL_PAGE_SIZE): Promise<Review[]> => {
    const docs = await reviewRepository
      .findApprovedByProduct(productId, limit)
      .catch(() => [] as unknown[]);
    return (docs as FirestoreDocument[]).map(toReview);
  },
);

/**
 * Page 1 of a product's approved reviews, shaped exactly like `GET /api/reviews?productId=`
 * so it can seed `<ReviewsListingPanel initialData>` without a client round-trip.
 *
 * The defaults here MUST match the panel's bare (unfiltered, page-1) query defaults —
 * `staleTime: Infinity` freezes whatever `initialData` is handed over, so a mismatch would
 * pin the wrong rows into the cache (Recurrent Root Cause #30).
 */
export const getReviewPageForProduct = cache(
  async (
    productId: string,
    pageSize = REVIEWS_DETAIL_PAGE_SIZE,
  ): Promise<ReviewListResponse> => {
    const empty: ReviewListResponse = {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      hasMore: false,
      averageRating: 0,
      ratingDistribution: {},
      totalApproved: 0,
    };

    try {
      const [summary, result] = await Promise.all([
        reviewRepository.getApprovedRatingSummary(productId),
        reviewRepository.listForProduct(productId, {
          filters: sieveFilter(REVIEW_FIELDS.STATUS, SIEVE_OP.EQ, "approved"),
          sorts: sortBy(REVIEW_FIELDS.CREATED_AT),
          page: 1,
          pageSize,
        }),
      ]);

      return {
        items: (result.items as unknown as FirestoreDocument[]).map(toReview),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        averageRating: summary.averageRating,
        ratingDistribution: summary.ratingDistribution,
        totalApproved: summary.total,
      };
    } catch (err) {
      void normalizeError(err);
      return empty;
    }
  },
);

/** Minimal product fields needed for sitemap generation. */
export interface SitemapProduct {
  slugOrId: string;
  updatedAt: Date;
  /** Canonical listing-kind discriminator (SB1-G — Phase 4 dropped booleans). */
  listingType: ListingType;
}

/** List all published products for sitemap generation. */
export async function listSitemapProducts(): Promise<SitemapProduct[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_FIELDS.STATUS, "==", "published")
      .select("slug", "id", "updatedAt", "listingType")
      .limit(PRODUCTS_SITEMAP_LIMIT)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const rawListingType = data.listingType;
      const listingType: SitemapProduct["listingType"] =
        rawListingType === "auction" ||
        rawListingType === "pre-order" ||
        rawListingType === "prize-draw"
          ? rawListingType
          : "standard";
      return {
        slugOrId: (data.slug as string | undefined) ?? doc.id,
        updatedAt: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
        listingType,
      };
    });
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("products-data: listSitemapProducts failed — returning empty", { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Related items — same 4-signal computation shared by every listing-type
// detail page (category / brand / tag-overlap / same-store).
// ---------------------------------------------------------------------------

const RELATED_QUERY_PAGE_SIZE = 9;
const RELATED_DISPLAY_LIMIT = 8;

export interface RelatedItemsResult {
  relatedItems: ProductItem[];
  relatedByBrand: ProductItem[];
  relatedByTags: ProductItem[];
  relatedByStore: ProductItem[];
}

/** Firestore doc → card-grid shape. Shared by every related/similar-items carousel. */

/**
 * Excludes the current product, anything not publicly visible, and anything
 * no longer available — ended auctions, closed prize-draws, filled pre-orders,
 * depleted code pools, sold-out stock.
 *
 * This used to be a private `isValidRelatedItem` here, and it was the only
 * per-type availability predicate in the codebase — which meant it was also
 * the only place three bugs could hide: it read `codesAvailable` at the top
 * level when the schema nests it under `digitalCode.codesAvailable` (so that
 * branch never fired), it excluded `status` values ("sold", "out_of_stock",
 * "discontinued") that are not members of the real `ProductStatus` union, and
 * it had no branch at all for classified / live / art / stickers. It now
 * shares one definition with the listing query and the homepage.
 */
function toRelatedItems(docs: unknown[], currentProductId: string): ProductItem[] {
  const now = new Date();
  return (docs as FirestoreDocument[])
    .filter(
      (r) =>
        r.id !== currentProductId && isPubliclyVisible(r) && isListingRowAvailable(r, now),
    )
    .slice(0, RELATED_DISPLAY_LIMIT)
    .map(toProductItem);
}

/**
 * Same 4-signal related-items computation used across every listing-type
 * detail page (category / brand / tag-overlap / same-store), each excluding
 * invalid states for that item's own listing type. Extracted from
 * ProductDetailPageView so pre-order/prize-draw/classified/digital-code/live
 * pages can reuse it instead of having no related section at all.
 */
export const computeRelatedItems = cache(
  async (product: ProductDocument): Promise<RelatedItemsResult> => {
    const p = product as unknown as FirestoreDocument;
    const primaryCategorySlug = Array.isArray(p.categorySlugs) ? (p.categorySlugs[0] as string | undefined) : undefined;
    const brand = typeof p.brand === "string" ? p.brand : undefined;
    const tags = Array.isArray(p.tags) ? (p.tags as string[]) : [];
    const storeId = typeof p.storeId === "string" ? p.storeId : undefined;
    const currentProductId = product.id;

    const [sameCategoryDocs, sameBrandDocs, tagOverlapDocs, sameStoreDocs] = await Promise.all([
      primaryCategorySlug
        ? productRepository.findByCategory(primaryCategorySlug).catch(() => [] as unknown[])
        : Promise.resolve([] as unknown[]),
      brand
        ? productRepository
            .list({
              filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("brand", SIEVE_OP.EQ, brand)),
              sorts: sortBy("createdAt", "DESC"),
              page: 1,
              pageSize: RELATED_QUERY_PAGE_SIZE,
            })
            .then((r) => r.items)
            .catch(() => [] as unknown[])
        : Promise.resolve([] as unknown[]),
      tags.length > 0
        ? productRepository.findByTagsOverlap(tags, RELATED_QUERY_PAGE_SIZE).catch(() => [] as unknown[])
        : Promise.resolve([] as unknown[]),
      storeId
        ? productRepository
            .list({
              filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("storeId", SIEVE_OP.EQ, storeId)),
              sorts: sortBy("createdAt", "DESC"),
              page: 1,
              pageSize: RELATED_QUERY_PAGE_SIZE,
            })
            .then((r) => r.items)
            .catch(() => [] as unknown[])
        : Promise.resolve([] as unknown[]),
    ]);

    return {
      relatedItems: toRelatedItems(sameCategoryDocs, currentProductId),
      relatedByBrand: toRelatedItems(sameBrandDocs, currentProductId),
      relatedByTags: toRelatedItems(tagOverlapDocs, currentProductId),
      relatedByStore: toRelatedItems(sameStoreDocs, currentProductId),
    };
  },
);
