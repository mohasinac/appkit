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
import { getProviders } from "@mohasinac/contracts";

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

// ─── GET /api/stores/[storeSlug]/reviews ──────────────────────────────────────
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { storeSlug } = await context.params;

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
      filters: `sellerId==${store.ownerId},status==published`,
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

    // Flatten, sort by date desc, cap to 10 most recent
    const allReviews: ReviewEntity[] = reviewArrays
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
      .slice(0, 10);

    // Compute aggregate metrics
    const ratingDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let ratingSum = 0;
    let totalReviews = 0;

    for (const reviews of reviewArrays) {
      for (const review of reviews) {
        totalReviews++;
        ratingSum += review.rating;
        ratingDistribution[review.rating] =
          (ratingDistribution[review.rating] ?? 0) + 1;
      }
    }

    const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;

    // Enrich reviews with product title + main image
    const productMap = new Map(products.map((p) => [p.id, p]));
    const reviewsWithProduct = allReviews.map((review) => ({
      ...review,
      productTitle:
        productMap.get(review.productId)?.title ?? review.productTitle,
      productMainImage: productMap.get(review.productId)?.mainImage ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviewsWithProduct,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
      },
    });
  } catch (error) {
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
