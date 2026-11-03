import React from "react";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import { listStoreProducts } from "../../../_internal/server/features/products/list-public";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreCollectorDropsListing } from "./StoreCollectorDropsListing";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

type SearchParams = Record<string, string | string[]>;

const LISTING_TYPES = ["collector-drop"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.COLLECTOR_DROP_END_DATE, "ASC");

export interface StoreCollectorDropsPageViewProps {
  storeSlug: string;
  searchParams?: SearchParams;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export async function StoreCollectorDropsPageView({ storeSlug, searchParams, pageRegionCards = [] }: StoreCollectorDropsPageViewProps) {
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

  return (
    <>
      <AdminComposableRegion pageId="stores-storeslug-collector-drops" initialCards={pageRegionCards} />
      <StoreCollectorDropsListing storeId={storeId} initialData={result ?? undefined} />
    </>
  );
}
