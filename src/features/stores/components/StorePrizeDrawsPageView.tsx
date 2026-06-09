import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { productRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";

export interface StorePrizeDrawsPageViewProps {
  storeSlug: string;
}

/**
 * Public store → Prize Draws tab (SB7-D).
 *
 * Server-fetches the seller's prize-draw products and hands them to the
 * client `PrizeDrawsIndexListing` scoped to this store. Mirrors the
 * StorePreOrdersPageView pattern.
 */
export async function StorePrizeDrawsPageView({
  storeSlug,
}: StorePrizeDrawsPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  if (!storeId) {
    return null;
  }

  const result = await productRepository
    .list({
      filters: `storeId==${storeId},status==published,listingType==prize-draw`,
      sorts: sortBy("createdAt", "DESC"),
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  return (
    <PrizeDrawsIndexListing
      storeId={storeId}
      initialData={result ?? undefined}
    />
  );
}
