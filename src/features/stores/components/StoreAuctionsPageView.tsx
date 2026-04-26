import React from "react";
import { productRepository, storeRepository } from "../../../repositories";
import { StoreAuctionsListing } from "./StoreAuctionsListing";

export interface StoreAuctionsPageViewProps {
  storeSlug: string;
}

export async function StoreAuctionsPageView({ storeSlug }: StoreAuctionsPageViewProps) {
  const store = await storeRepository.findBySlug(storeSlug).catch(() => undefined);
  const ownerId = (store as Record<string, any>)?.ownerId;

  const result = ownerId
    ? await productRepository
        .list({
          filters: `sellerId==${ownerId},status==published,isAuction==true`,
          sorts: "auctionEndDate",
          page: 1,
          pageSize: 24,
        })
        .catch(() => null)
    : null;

  if (!ownerId) {
    return null;
  }

  return (
    <StoreAuctionsListing
      sellerId={ownerId}
      initialData={result ?? undefined}
    />
  );
}
