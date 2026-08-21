import React from "react";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import { listStoreProducts } from "../../../_internal/server/features/products/list-public";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreDigitalCodesListing } from "./StoreDigitalCodesListing";

type SearchParams = Record<string, string | string[]>;

const LISTING_TYPES = ["digital-code"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

export interface StoreDigitalCodesPageViewProps {
  storeSlug: string;
  searchParams?: SearchParams;
}

export async function StoreDigitalCodesPageView({ storeSlug, searchParams }: StoreDigitalCodesPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, unknown> | null)?.id;
  if (typeof storeId !== "string" || !storeId) return null;

  // Shared query — see listStoreProducts. This view used to call
  // productRepository.list() with an inline filter string and swallow every
  // failure via a bare .catch(() => null), so a missing index rendered as an
  // empty store tab with nothing logged (Root Cause #30's family).
  const result = await listStoreProducts(storeId, LISTING_TYPES, searchParams ?? {}, {
    pageSize: DEFAULT_PAGE_SIZE,
    sorts: DEFAULT_SORT,
  });

  return <StoreDigitalCodesListing storeId={storeId} initialData={result ?? undefined} />;
}
