import React from "react";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import { listStoreProducts } from "../../../_internal/server/features/products/list-public";
import { ART_STICKERS_LISTING_TYPES } from "../../products/constants/listing-tabs";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { StoreProductsListing } from "./StoreProductsListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

export interface StoreArtStickersPageViewProps {
  storeSlug: string;
  searchParams?: SearchParams;
}

/**
 * A store's combined Art & Stickers tab.
 *
 * This page did not exist until 2026-08-21: `STORE_PAGE_TABS` had an
 * "Art & Stickers" entry with a real count query behind it, but its href
 * pointed at `STORE_PRODUCTS` — a page that filters `listingType == standard`.
 * So the tab advertised a non-zero count and then rendered none of those items,
 * with no error. Same shape as the category/brand tabs that rendered blank
 * panels (see `audit-tab-body-coverage.mjs`), one level up.
 *
 * Mirrors the public `/art` page in spanning both types at once, since neither
 * has enough inventory to justify a tab of its own.
 */
export async function StoreArtStickersPageView({
  storeSlug,
  searchParams,
}: StoreArtStickersPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, unknown> | null)?.id;
  if (typeof storeId !== "string" || !storeId) return null;

  const result = await listStoreProducts(
    storeId,
    ART_STICKERS_LISTING_TYPES,
    searchParams ?? {},
    { pageSize: DEFAULT_PAGE_SIZE, sorts: DEFAULT_SORT },
  );

  return (
    <StoreProductsListing
      storeId={storeId}
      listingTypes={ART_STICKERS_LISTING_TYPES}
      initialData={result ?? undefined}
    />
  );
}
