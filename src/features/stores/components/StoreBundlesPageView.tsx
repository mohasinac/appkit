import React from "react";
import { bundlesRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { BundlesByCategoryListing } from "../../bundles/components/BundlesByCategoryListing";

export interface StoreBundlesPageViewProps {
  storeSlug: string;
}

/**
 * Public store → Bundles tab (SB7-D / S7-PrizeDraws-3).
 *
 * Server-fetches all published bundles for the seller and hands them to
 * `BundlesByCategoryListing`. Mirrors the StorePrizeDrawsPageView pattern.
 */
export async function StoreBundlesPageView({
  storeSlug,
}: StoreBundlesPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  if (!storeId) {
    return null;
  }

  const bundles = await bundlesRepository
    .findByStore(storeId, "published")
    .catch(() => []);

  return <BundlesByCategoryListing initialBundles={bundles} />;
}
