import React from "react";
import { productRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreAuctionsListing } from "./StoreAuctionsListing";

export interface StoreAuctionsPageViewProps {
  storeSlug: string;
}

export async function StoreAuctionsPageView({ storeSlug }: StoreAuctionsPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  const result = storeId
    ? await productRepository
        .list({
          filters: `storeId==${storeId},status==published,isAuction==true`,
          sorts: "auctionEndDate",
          page: 1,
          pageSize: 24,
        })
        .catch(() => null)
    : null;

  if (!storeId) {
    return null;
  }

  return (
    <StoreAuctionsListing
      storeId={storeId}
      initialData={result ?? undefined}
    />
  );
}
