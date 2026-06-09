import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { productRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StorePreOrdersListing } from "./StorePreOrdersListing";

export interface StorePreOrdersPageViewProps {
  storeSlug: string;
}

export async function StorePreOrdersPageView({ storeSlug }: StorePreOrdersPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  const result = storeId
    ? await productRepository
        .list({
          filters: `storeId==${storeId},status==published,listingType==pre-order`,
          sorts: sortBy("createdAt", "DESC"),
          page: 1,
          pageSize: 24,
        })
        .catch(() => null)
    : null;

  if (!storeId) {
    return null;
  }

  return (
    <StorePreOrdersListing
      storeId={storeId}
      initialData={result ?? undefined}
    />
  );
}
