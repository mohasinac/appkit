"use server";

import { cache } from "react";
import { storeRepository, productRepository } from "../../../../repositories";
import type { StoreDocument } from "../../../../features/stores/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import {
  STORES_PRODUCTS_PAGE_SIZE,
  STORES_SITEMAP_LIMIT,
} from "../../../shared/features/stores/config";

/** Full store document by slug — deduped per request via React.cache(). */
export const getStoreForDetail = cache(
  async (slug: string): Promise<StoreDocument | null> => {
    return (await storeRepository.findBySlug(slug).catch(() => undefined)) ?? null;
  },
);

/**
 * Published products for a store detail page.
 * Returns the first page used for SSR initial data.
 */
export const listStoreProductsInitial = cache(
  async (
    storeId: string,
    page = 1,
  ): Promise<{ items: ProductDocument[]; total: number }> => {
    const result = await productRepository
      .list({
        filters: `storeId==${storeId},status==published,isAuction==false,isPreOrder==false`,
        sorts: "-createdAt",
        page,
        pageSize: STORES_PRODUCTS_PAGE_SIZE,
      })
      .catch(() => null);
    return { items: result?.items ?? [], total: result?.total ?? 0 };
  },
);

/**
 * Published auctions for a store detail page.
 */
export const listStoreAuctionsInitial = cache(
  async (
    storeId: string,
    page = 1,
  ): Promise<{ items: ProductDocument[]; total: number }> => {
    const result = await productRepository
      .list({
        filters: `storeId==${storeId},status==published,isAuction==true`,
        sorts: "-createdAt",
        page,
        pageSize: STORES_PRODUCTS_PAGE_SIZE,
      })
      .catch(() => null);
    return { items: result?.items ?? [], total: result?.total ?? 0 };
  },
);

/**
 * Published pre-orders for a store detail page.
 */
export const listStorePreOrdersInitial = cache(
  async (
    storeId: string,
    page = 1,
  ): Promise<{ items: ProductDocument[]; total: number }> => {
    const result = await productRepository
      .list({
        filters: `storeId==${storeId},status==published,isPreOrder==true`,
        sorts: "-createdAt",
        page,
        pageSize: STORES_PRODUCTS_PAGE_SIZE,
      })
      .catch(() => null);
    return { items: result?.items ?? [], total: result?.total ?? 0 };
  },
);

/** Stores for sitemap generation. */
export const listSitemapStores = cache(
  async (): Promise<{ storeSlug: string; updatedAt: Date }[]> => {
    const result = await storeRepository
      .listStores(
        { filters: "status==active", sorts: "-updatedAt", page: 1, pageSize: STORES_SITEMAP_LIMIT },
        true,
      )
      .catch(() => null);
    return (result?.items ?? []).map(({ storeSlug, updatedAt }) => ({ storeSlug, updatedAt }));
  },
);
