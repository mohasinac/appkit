import React from "react";
import { categoriesRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { CategoryBundlesListing } from "../../categories/components/CategoryBundlesListing";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

export interface StoreBundlesPageViewProps {
  storeSlug: string;
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
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
  onBuyNow,
}: StoreBundlesPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  if (!storeId) {
    return null;
  }

  const bundles = await safeRead(
    () =>
      categoriesRepository
        .listByType("bundle", { activeOnly: true, limit: 50 })
        .then((rows) => rows.filter((c) => c.createdByStoreId === storeId)),
    {
      route: "/stores/[storeSlug]/bundles",
      key: "categories.listByType(bundle)",
      fallback: [],
    },
  );

  return (
    <CategoryBundlesListing
      initialBundles={hidePublicTestData(bundles)}
      onBuyNow={onBuyNow}
    />
  );
}
