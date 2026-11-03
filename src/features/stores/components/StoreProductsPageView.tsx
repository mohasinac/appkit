import React from "react";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import { listStoreProducts } from "../../../_internal/server/features/products/list-public";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreProductsListing } from "./StoreProductsListing";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

type SearchParams = Record<string, string | string[]>;

const LISTING_TYPES = ["standard"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

export interface StoreProductsPageViewProps {
  storeSlug: string;
  searchParams?: SearchParams;
  /**
   * Stable, hand-chosen page-region id (Phase 12) — this one view is shared
   * by `/stores/[storeSlug]/products` and the legacy
   * `/stores/[storeSlug]/[tab]/sort/[sortKey]/page/[page]` route (when
   * `tab === "products"`), so every caller computes its own
   * route-template-derived id rather than this component guessing one.
   */
  pageId: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export async function StoreProductsPageView({ storeSlug, searchParams, pageId, pageRegionCards = [] }: StoreProductsPageViewProps) {
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
      <AdminComposableRegion pageId={pageId} initialCards={pageRegionCards} />
      <StoreProductsListing storeId={storeId} initialData={result ?? undefined} />
    </>
  );
}
