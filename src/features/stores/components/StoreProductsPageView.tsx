import React from "react";
import { productRepository } from "../../../repositories";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreProductsListing } from "./StoreProductsListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

export interface StoreProductsPageViewProps {
  storeSlug: string;
  searchParams?: SearchParams;
}

export async function StoreProductsPageView({
  storeSlug,
  searchParams,
}: StoreProductsPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = store?.id;

  if (!storeId) {
    return null;
  }

  const std = parseListingSearchParams(searchParams);
  const sorts = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;

  const result = await productRepository
    .list({
      filters: `storeId==${storeId},status==published,listingType==standard`,
      sorts,
      page,
      pageSize,
    })
    .catch(() => null);

  return (
    <StoreProductsListing
      storeId={storeId}
      initialData={result ?? undefined}
    />
  );
}
