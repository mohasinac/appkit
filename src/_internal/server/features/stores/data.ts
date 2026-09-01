"use server";

import { cache } from "react";
import { storeRepository } from "../../../../repositories";
import type { StoreDocument } from "../../../../features/stores/schemas/firestore";
import {
  STORES_PRODUCTS_PAGE_SIZE,
  STORES_SITEMAP_LIMIT,
} from "../../../shared/features/stores/config";
import { makeGetStoreListingsInitial } from "../shared/listing-data-factory";
import { safeRead } from "../../../../errors/safe-read";

/** Full store document by slug — deduped per request via React.cache(). */
export const getStoreForDetail = cache(
  async (slug: string): Promise<StoreDocument | null> => {
    return (await storeRepository.findBySlug(slug)) ?? null;
  },
);

// Collapse of three near-identical 14-line functions via factory — export names unchanged.
export const listStoreProductsInitial  = makeGetStoreListingsInitial("standard",  STORES_PRODUCTS_PAGE_SIZE);
export const listStoreAuctionsInitial  = makeGetStoreListingsInitial("auction",   STORES_PRODUCTS_PAGE_SIZE);
export const listStorePreOrdersInitial = makeGetStoreListingsInitial("pre-order", STORES_PRODUCTS_PAGE_SIZE);

/** Stores for sitemap generation. */
export const listSitemapStores = cache(
  async (): Promise<{ storeSlug: string; updatedAt: Date }[]> => {
    /*
     * The SITEMAP. A swallowed failure here publishes a sitemap missing every
     * store — which is not an error to any crawler, just a smaller site.
     */
    const result = await safeRead(
      () =>
        storeRepository.listStores(
          { filters: "status==active", sorts: "-updatedAt", page: 1, pageSize: STORES_SITEMAP_LIMIT },
          true,
        ),
      { route: "sitemap/stores", key: "stores.listStores", fallback: null },
    );
    return (result?.items ?? []).map(({ storeSlug, updatedAt }) => ({ storeSlug, updatedAt }));
  },
);
