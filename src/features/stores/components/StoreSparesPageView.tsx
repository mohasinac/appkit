import React from "react";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import { listStoreProducts } from "../../../_internal/server/features/products/list-public";
import { getStoreBySlug } from "./StoreDetailLayoutView";
import { ProductsIndexListing } from "../../products/components/ProductsIndexListing";

type SearchParams = Record<string, string | string[]>;

const LISTING_TYPES = ["spares"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

export interface StoreSparesPageViewProps {
  storeSlug: string;
  searchParams?: SearchParams;
}

/**
 * One store's spares tab.
 *
 * 🛑 This page EXISTS because `STORE_PAGE_TABS` is derived from the plugin
 * registry: the Spares tab appeared on every store page the moment the plugin
 * landed, and a missing folder here is a clickable 404 that no audit covers.
 * It is the named risk in the Part Two plan and the reason this ships in the
 * same change as the route key.
 *
 * 🛑 It reuses `ProductsIndexListing` with a `storeId` rather than adding a
 * seventh hand-written `Store<Type>Listing`. Six of those exist, ~140 lines
 * each of identical toolbar/availability/pagination/grid scaffolding — already
 * past the Duplication Framework's Rule of Three. Consolidating them is its own
 * session; declining to make it worse cost one prop.
 *
 * `typeTabs={[]}` suppresses the listing-type facet: this page spans exactly
 * one type, so the facet would render a single checkbox that changes nothing.
 * `ProductFilters` already guards on an empty option list.
 */
export async function StoreSparesPageView({ storeSlug, searchParams }: StoreSparesPageViewProps) {
  const store = await getStoreBySlug(storeSlug);
  const storeId = (store as Record<string, unknown> | null)?.id;
  if (typeof storeId !== "string" || !storeId) return null;

  // The shared query — never `productRepository.list()` with an inline filter
  // string swallowed by `.catch(() => null)`, which is how the six older store
  // tabs rendered empty with nothing logged when an index was missing.
  const result = await listStoreProducts(storeId, LISTING_TYPES, searchParams ?? {}, {
    pageSize: DEFAULT_PAGE_SIZE,
    sorts: DEFAULT_SORT,
  });

  return (
    <ProductsIndexListing
      // `undefined`, not `null` — React Query treats `null` as defined data, so
      // a failed query would freeze an empty grid under `staleTime: Infinity`.
      initialData={result ?? undefined}
      listingTypes={LISTING_TYPES}
      typeTabs={[]}
      storeId={storeId}
      searchPlaceholder="Search this store's spares..."
    />
  );
}
