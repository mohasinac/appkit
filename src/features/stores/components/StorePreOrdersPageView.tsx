import React from "react";
import { productRepository, storeRepository } from "../../../repositories";
import { StorePreOrdersListing } from "./StorePreOrdersListing";

export interface StorePreOrdersPageViewProps {
  storeSlug: string;
}

export async function StorePreOrdersPageView({ storeSlug }: StorePreOrdersPageViewProps) {
  const store = await storeRepository.findBySlug(storeSlug).catch(() => undefined);
  const ownerId = (store as Record<string, any>)?.ownerId;

  const result = ownerId
    ? await productRepository
        .list({
          filters: `sellerId==${ownerId},status==published,isPreOrder==true`,
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
    <StorePreOrdersListing
      sellerId={ownerId}
      initialData={result ?? undefined}
    />
  );
}
