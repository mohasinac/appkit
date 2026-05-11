import { cache } from "react";
import { productRepository } from "../../../../repositories";
import { reviewRepository } from "../../../../repositories";
import { getAdminDb } from "../../../../providers/db-firebase";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { PRODUCTS_SITEMAP_LIMIT } from "../../../shared/features/products/config";

// ---------------------------------------------------------------------------
// Request-scoped cache — each function is deduplicated per RSC render tree.
// Both generateMetadata() and the page component get the same promise.
// ---------------------------------------------------------------------------

/** Fetch a single product by slug or id, deduped per request. */
export const getProductForDetail = cache(
  async (slugOrId: string): Promise<ProductDocument | null> => {
    return (await productRepository.findByIdOrSlug(slugOrId).catch(() => undefined)) ?? null;
  },
);

/** Fetch the first page of approved reviews for a product, deduped per request. */
export const getReviewsForProduct = cache(
  async (productId: string): Promise<unknown[]> => {
    return reviewRepository.findApprovedByProduct(productId).catch(() => []);
  },
);

/** Minimal product fields needed for sitemap generation. */
export interface SitemapProduct {
  slugOrId: string;
  updatedAt: Date;
  isAuction: boolean;
}

/** List all published products for sitemap generation. */
export async function listSitemapProducts(): Promise<SitemapProduct[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(PRODUCT_COLLECTION)
      .where("status", "==", "published")
      .select("slug", "id", "updatedAt", "isAuction")
      .limit(PRODUCTS_SITEMAP_LIMIT)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        slugOrId: (data.slug as string | undefined) ?? doc.id,
        updatedAt: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
        isAuction: data.isAuction === true,
      };
    });
  } catch {
    return [];
  }
}
