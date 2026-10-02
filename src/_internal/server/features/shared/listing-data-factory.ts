import { cache } from "react";
import { productRepository } from "../../../../repositories";
import { safeRead } from "../../../../errors/safe-read";
import { loadProductFeaturesForStore } from "../../../../features/products/repository/loadProductFeatures";
import type { ListingType } from "../../../../features/products/types";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ProductFeatureDocument } from "../../../../features/products/schemas/product-features";
import { isPubliclyVisible } from "../../../shared/listing-types/availability";

// Returns a React.cache()-wrapped fetch gated on one listing type.
// The guard prevents cross-type URL collisions (e.g. /auctions/classified-slug returning wrong product).
//
// 🛑 THE STATUS GATE IS LOAD-BEARING, AND ITS ABSENCE WAS A LIVE LEAK.
//
// Until 2026-10-02 this checked existence and listing type only. Measured on
// production, signed out: an admin archiving OR rejecting a classified did NOT
// remove it from /classified/{slug} — the page rendered in full, h1, description,
// seller card and a live "Request to Buy" CTA. Deleting the product 404s the same
// URL immediately, so the route reads live data; it simply had no status
// predicate. A listing rejected as fraudulent stayed publicly buyable at its own
// URL, and because the admin row updated correctly every time, the moderator had
// no way to notice.
//
// One gate here covers SIX detail routes — auction, classified, digital-code,
// live, pre-order, prize-draw — which is why it belongs in the factory rather
// than in each page.
//
// `isPubliclyVisible` is the same predicate every public LIST query uses, and it
// deliberately treats a MISSING status as visible: documents written before the
// field existed must not vanish. It gates on status alone and says nothing about
// availability — a sold-out or ended listing must still render, with its own
// unavailable chrome, because a buyer following an old link deserves to be told
// it is gone rather than shown a 404.
export function makeGetListingForDetail(
  type: ListingType,
): (slugOrId: string) => Promise<ProductDocument | null> {
  return cache(async (slugOrId: string): Promise<ProductDocument | null> => {
    if (!slugOrId) return null;
    const product = await productRepository.findByIdOrSlug(slugOrId);
    if (!product || product.listingType !== type) return null;
    // `AvailabilityRow` is `Record<string, FirestoreValue>` on purpose — the same
    // predicate serves Firestore documents, the Function's ISO-string rows and
    // JSON from /api/products. A declared interface has no index signature, so
    // the honest adaptation is to hand it the one field it reads rather than to
    // cast a whole document past the type system (Root Cause #98).
    if (!isPubliclyVisible({ status: product.status })) return null;
    return product;
  });
}

// Product-feature badges are keyed by store, not listing type.
// Per-type data.ts files re-export this under a type-specific name.
export const getProductFeaturesForStore = cache(
  async (storeId: string | null): Promise<ProductFeatureDocument[]> =>
    safeRead(() => loadProductFeaturesForStore(storeId), {
      route: "/products",
      key: "products.getProductFeaturesForStore",
      fallback: [],
    }),
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
