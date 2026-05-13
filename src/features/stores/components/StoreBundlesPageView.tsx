import React from "react";
import { categoriesRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { CategoryBundlesListing } from "../../categories/components/CategoryBundlesListing";

export interface StoreBundlesPageViewProps {
  storeSlug: string;
}

/**
 * Public store → Bundles tab.
 *
 * SB-UNI-D + V: bundles are categoryType:"bundle" rows on the categories
 * collection, scoped to the seller via `createdByStoreId`. Server-fetches
 * the seller's active bundle categories and hands them to
 * `CategoryBundlesListing`. Mirrors the StorePrizeDrawsPageView pattern.
 */
export async function StoreBundlesPageView({
  storeSlug,
}: StoreBundlesPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  if (!storeId) {
    return null;
  }

  const bundles = await categoriesRepository
    .listByType("bundle", { activeOnly: true, limit: 50 })
    .then((rows) => rows.filter((c) => c.createdByStoreId === storeId))
    .catch(() => []);

  return <CategoryBundlesListing initialBundles={bundles} />;
}
