/**
 * feat-stores — store reviews aggregate (GET /api/stores/[storeSlug]/reviews)
 *
 * 2-line stub:
 * ```ts
 * // app/api/stores/[storeSlug]/reviews/route.ts
 * export { storeReviewsGET as GET } from "@mohasinac/feat-stores";
 * ```
 *
 * Aggregates approved reviews from up to 20 published products in a store.
 * Returns: reviews[], averageRating, totalReviews, ratingDistribution.
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collections: "stores", "products", "reviews"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../../contracts";

import { normalizeError } from "../../../../../errors/normalize";
type RouteContext = { params: Promise<{ storeSlug: string }> };

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

    // Fetch up to 20 published products for this seller
    const productsRepo = db.getRepository<ProductEntity>("products");
    const productsResult = await productsRepo.findAll({
      filters: `storeId==${store.id},status==published`,
      sort: "itemsSold",
      order: "desc",
      perPage: 20,
    });
    const products = productsResult.data;

    // Fetch approved reviews for each product in parallel (cap 50 per product)
    const reviewsRepo = db.getRepository<ReviewEntity>("reviews");
    const reviewArrays = await Promise.all(
      products.map((p) =>
        reviewsRepo
          .findAll({
            filters: `productId==${p.id},status==approved`,
            sort: "createdAt",
            order: "desc",
            perPage: 50,
          })
          .then((r) => r.data),
      ),
    );

    // Compute aggregate metrics from ALL reviews (unfiltered)
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    let totalReviews = 0;

    for (const reviews of reviewArrays) {
      for (const review of reviews) {
        totalReviews++;
        ratingSum += review.rating;
        ratingDistribution[review.rating] = (ratingDistribution[review.rating] ?? 0) + 1;
      }
    }

    const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;

    // Flatten all reviews
    const productMap = new Map(products.map((p) => [p.id, p]));
    const allFlat: ReviewEntity[] = reviewArrays.flat();

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
        const title = ((r as ReviewEntity & { title?: string }).title ?? "").toLowerCase();
        const body = ((r as ReviewEntity & { body?: string }).body ?? "").toLowerCase();
        const pt = (r.productTitle ?? "").toLowerCase();
        return title.includes(q) || body.includes(q) || pt.includes(q);
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

    // Enrich with product title + main image
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
