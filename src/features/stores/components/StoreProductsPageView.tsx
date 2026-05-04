import React from "react";
import { productRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreProductsListing } from "./StoreProductsListing";

export interface StoreProductsPageViewProps {
  storeSlug: string;
}

export async function StoreProductsPageView({ storeSlug }: StoreProductsPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  const result = storeId
    ? await productRepository
        .list({
          filters: `storeId==${storeId},status==published,isAuction==false`,
          sorts: "-createdAt",
          page: 1,
          pageSize: 24,
        })
        .catch(() => null)
    : null;

  if (!storeId) {
    return null;
  }

  return (
    <StoreProductsListing
      storeId={storeId}
      initialData={result ?? undefined}
    />
  );
}
