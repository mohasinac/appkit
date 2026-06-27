import { cache } from "react";
import { productRepository } from "../../../../repositories";
import { loadProductFeaturesForStore } from "../../../../features/products/repository/loadProductFeatures";
import type { ListingType } from "../../../../features/products/types";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ProductFeatureDocument } from "../../../../features/products/schemas/product-features";

// Returns a React.cache()-wrapped fetch gated on one listing type.
// The guard prevents cross-type URL collisions (e.g. /auctions/classified-slug returning wrong product).
export function makeGetListingForDetail(
  type: ListingType,
): (slugOrId: string) => Promise<ProductDocument | null> {
  return cache(async (slugOrId: string): Promise<ProductDocument | null> => {
    if (!slugOrId) return null;
    const product = await productRepository.findByIdOrSlug(slugOrId).catch(() => undefined);
    if (!product || product.listingType !== type) return null;
    return product;
  });
}

// Product-feature badges are keyed by store, not listing type.
// Per-type data.ts files re-export this under a type-specific name.
export const getProductFeaturesForStore = cache(
  async (storeId: string | null): Promise<ProductFeatureDocument[]> =>
    loadProductFeaturesForStore(storeId).catch(() => []),
);

// Returns a React.cache()-wrapped function for store SSR first-page data.
// Export names in stores/data.ts stay identical so consumers need no changes.
export function makeGetStoreListingsInitial(
  type: ListingType,
  pageSize: number,
): (storeId: string, page?: number) => Promise<{ items: ProductDocument[]; total: number }> {
  return cache(async (storeId: string, page = 1) => {
    const result = await productRepository
      .list({
        filters: `storeId==${storeId},status==published,listingType==${type}`,
        sorts: "-createdAt",
        page,
        pageSize,
      })
      .catch(() => null);
    return { items: result?.items ?? [], total: result?.total ?? 0 };
  });
}
