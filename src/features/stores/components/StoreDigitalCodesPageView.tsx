import { sieveFilter, sieveAnd, SIEVE_OP, sortBy, PRODUCT_FIELDS } from "@mohasinac/appkit";
import React from "react";
import { productRepository } from "../../../repositories";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreDigitalCodesListing } from "./StoreDigitalCodesListing";

export interface StoreDigitalCodesPageViewProps {
  storeSlug: string;
}

export async function StoreDigitalCodesPageView({ storeSlug }: StoreDigitalCodesPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, any>)?.id;

  if (!storeId) return null;

  const result = await productRepository
    .list({
      filters: sieveAnd(
        sieveFilter("storeId", SIEVE_OP.EQ, storeId),
        sieveFilter("status", SIEVE_OP.EQ, "published"),
        sieveFilter("listingType", SIEVE_OP.EQ, "digital-code"),
      ),
      sorts: sortBy(PRODUCT_FIELDS.CREATED_AT),
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  return <StoreDigitalCodesListing storeId={storeId} initialData={result ?? undefined} />;
}
