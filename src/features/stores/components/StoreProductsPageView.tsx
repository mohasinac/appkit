import React from "react";
import { productRepository, storeRepository } from "../../../repositories";
import { StoreProductsListing } from "./StoreProductsListing";

export interface StoreProductsPageViewProps {
  storeSlug: string;
}

export async function StoreProductsPageView({ storeSlug }: StoreProductsPageViewProps) {
  const store = await storeRepository.findBySlug(storeSlug).catch(() => undefined);
  const ownerId = (store as Record<string, any>)?.ownerId;

  const result = ownerId
    ? await productRepository
        .list({
          filters: `sellerId==${ownerId},status==published,isAuction==false`,
          sorts: "-createdAt",
          page: 1,
          pageSize: 24,
        })
        .catch(() => null)
    : null;

  if (!ownerId) {
    return null;
  }

  return (
    <StoreProductsListing
      sellerId={ownerId}
      initialData={result ?? undefined}
    />
  );
}
