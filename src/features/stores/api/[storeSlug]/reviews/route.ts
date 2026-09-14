/**
 * feat-stores — store reviews aggregate (GET /api/stores/[storeSlug]/reviews)
 *
 * 2-line stub:
 * ```ts
 * // app/api/stores/[storeSlug]/reviews/route.ts
 * export { storeReviewsGET as GET } from "@mohasinac/feat-stores";
 * ```
 *
 * Aggregates every approved review filed against a store, by `storeId`.
 * Returns: reviews[], averageRating, totalReviews, ratingDistribution.
 *
 * It used to aggregate "up to 20 published products by itemsSold" and fan out a
 * review query per product — and since no product carries `itemsSold`, that
 * `orderBy` matched nothing and the endpoint returned zero reviews for every
 * store. See the block comment at the query for the full account.
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collections: "stores", "products", "reviews"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../../contracts";

import { normalizeError } from "../../../../../errors/normalize";
type RouteContext = { params: Promise<{ storeSlug: string }> };

/**
 * Upper bound on the reviews scanned to build a store's aggregate. The average
 * rating and the distribution are computed over this window, so it must be
 * generous — but it is still a bound, because the alternative is an unbounded
 * read on a public, cacheable endpoint (Rule #6).
 */
const STORE_REVIEW_SCAN_CAP = 500;


interface StoreEntity {
  id: string;
  ownerId: string;
}

interface ProductEntity {
  id: string;
  title?: string;
  mainImage?: string | null;
}

interface ReviewEntity {
  productId: string;
  createdAt?: string;
  rating: number;
  productTitle?: string;
}

// --- GET /api/stores/[storeSlug]/reviews --------------------------------------
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { storeSlug } = await context.params;
    const url = new URL(request.url);
    const ratingParam = url.searchParams.get("rating");
    const ratingFilter = ratingParam ? Number(ratingParam) : 0;
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || "12")));
    const sort = url.searchParams.get("sort") || url.searchParams.get("sorts") || "-createdAt";
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const dateFrom = url.searchParams.get("dateFrom") || "";
    const dateTo = url.searchParams.get("dateTo") || "";
    const hasImages = url.searchParams.get("hasImages") === "true";

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    // Resolve store by slug
    const storesRepo = db.getRepository<StoreEntity>("stores");
    const storeResult = await storesRepo.findAll({
      filters: `storeSlug==${storeSlug},status==active,isPublic==true`,
      perPage: 1,
    });
    const store = storeResult.data[0];
    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 },
      );
    }

    /*
     * 🛑 REVIEWS ARE FETCHED BY `storeId`, IN ONE QUERY. Do not route this back
     * through products.
     *
     * It used to select "the store's top 20 products by `itemsSold`" and then
     * fan out one review query per product. Two independent defects, and the
     * second hid the first:
     *
     *  - **`orderBy("itemsSold")` silently drops every document that lacks the
     *    field**, exactly like the documented `!=` trap. Measured on production
     *    2026-09-14: **0 of 95 products carry `itemsSold`**, so that query
     *    returned an empty array — and therefore so did the whole endpoint.
     *    Every store's reviews tab had been empty since it shipped, answering
     *    HTTP 200 with `totalReviews: 0` while 79 approved reviews sat in
     *    Firestore. Nothing errored; there was no symptom to report beyond "this
     *    store has no reviews yet", which reads as a fact about the store.
     *  - Even populated, a 20-product window is a SAMPLE, not the store: 14
     *    distinct products carry reviews here and the store has 65 listings, so
     *    an arbitrary slice would under-report the average rating and the
     *    distribution — the two numbers buyers actually judge a seller by.
     *
     * `ReviewDocument` carries `storeId` (74/79 here belong to this store), so
     * the store's reviews are one equality away. This also turns 21 Firestore
     * queries into 1, well inside Rule #6's ~3-round-trip budget.
     */
    const reviewsRepo = db.getRepository<ReviewEntity>("reviews");
    const reviewsResult = await reviewsRepo.findAll({
      filters: `storeId==${store.id},status==approved`,
      sort: "createdAt",
      order: "desc",
      perPage: STORE_REVIEW_SCAN_CAP,
    });
    const allFlat: ReviewEntity[] = reviewsResult.data;

    // Compute aggregate metrics from ALL reviews (unfiltered)
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    let totalReviews = 0;

    for (const review of allFlat) {
      totalReviews++;
      ratingSum += review.rating;
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] ?? 0) + 1;
    }

    const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;

    // Titles and images are enriched further down, from only the products the
    // reviews on the CURRENT PAGE name. Every review already carries a
    // denormalised `productTitle`, so a miss still renders a usable card.
    const productsRepo = db.getRepository<ProductEntity>("products");

    // Apply sort
    const sorted = [...allFlat].sort((a, b) => {
      if (sort === "createdAt" || sort === "+createdAt") {
        return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      }
      if (sort === "-rating" || sort === "rating") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sort === "rating,asc" || sort === "+rating" || sort === "ratingAsc") {
        return (a.rating ?? 0) - (b.rating ?? 0);
      }
      // Default: newest first
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

    // Apply rating filter
    let filtered = ratingFilter > 0
      ? sorted.filter((r) => Math.round(r.rating) === ratingFilter)
      : sorted;

    // Apply search
    if (q) {
      filtered = filtered.filter((r) => {
        const rv = r as ReviewEntity & { title?: string; body?: string; comment?: string };
        const title = (rv.title ?? "").toLowerCase();
        /*
         * `comment` FIRST. The stored field is `comment` — verified against all
         * 79 production review documents, none of which has a `body`. This read
         * `body` alone, so searching a store's reviews only ever matched the
         * title or the product name, never a word the reviewer actually wrote.
         * `body` is kept as a fallback because it is what CLAUDE.md's reviews
         * row and several types call it; the two spellings have drifted and only
         * the data settles which is real.
         */
        const text = (rv.comment ?? rv.body ?? "").toLowerCase();
        const pt = (r.productTitle ?? "").toLowerCase();
        return title.includes(q) || text.includes(q) || pt.includes(q);
      });
    }

    // Apply date range
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      filtered = filtered.filter((r) => new Date(r.createdAt ?? 0).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86_400_000; // inclusive end of day
      filtered = filtered.filter((r) => new Date(r.createdAt ?? 0).getTime() <= to);
    }

    // Apply hasImages filter
    if (hasImages) {
      filtered = filtered.filter((r) => {
        const imgs = (r as ReviewEntity & { images?: unknown[] }).images;
        return Array.isArray(imgs) && imgs.length > 0;
      });
    }

    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const pageSlice = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Enrich with product title + main image — only the ids on this page.
    const pageProductIds = [...new Set(pageSlice.map((r) => r.productId).filter(Boolean))];
    /*
     * 🛑 DOCUMENT GETS, not a filter. The generic `findAll` on this provider
     * parses a clause as `.where(field, op, coerceValue(value))` and has no
     * pipe-join OR handling — so `id==a|b|c` would query for the LITERAL string
     * "a|b|c" and match nothing, silently, which is the exact defect class this
     * whole route is being fixed for. (Pipe-joins are a `sieveQuery` feature;
     * this repository is not that path.) `id` is also not a stored field.
     *
     * Bounded by `pageSize`, capped at 50 above and typically ~12.
     */
    const productMap = new Map<string, ProductEntity>();
    const fetched = await Promise.all(
      pageProductIds.map((id) =>
        productsRepo.findById(id).catch((err) => {
          // Named and logged, not swallowed: enrichment is genuinely optional
          // (every review carries a denormalised productTitle), but a silent
          // null here is indistinguishable from "that product was deleted" —
          // Root Cause #59's shape, which is what this whole route was fixed for.
          void normalizeError(err);
          console.warn(`[feat-stores] products.findById failed for ${id}`);
          return null;
        }),
      ),
    );
    for (const p of fetched) if (p) productMap.set(p.id, p);

    const reviewsWithProduct = pageSlice.map((review) => ({
      ...review,
      productTitle: productMap.get(review.productId)?.title ?? review.productTitle,
      productMainImage: productMap.get(review.productId)?.mainImage ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviewsWithProduct,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        totalFiltered,
        totalPages,
        ratingDistribution,
      },
    });
  } catch (error) {
    void normalizeError(error);
    console.error(
      "[feat-stores] GET /api/stores/[storeSlug]/reviews failed",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch store reviews" },
      { status: 500 },
    );
  }
}
