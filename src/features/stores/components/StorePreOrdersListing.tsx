"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Div, FilterDrawer, Grid, ListingToolbar, Pagination, Row, Stack, Text, StickyToolbar } from "../../../ui";
import { MarketplacePreorderCard } from "../../pre-orders/components/MarketplacePreorderCard";
import { ProductFilters } from "../../products/components/ProductFilters";
import { ROUTES } from "../../../next";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import { PREORDER_PUBLIC_SORT_OPTIONS } from "../../products/constants/sieve";
import { AvailabilityTabs } from "../../products/components/AvailabilityTabs";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { TABLE_KEYS } from "../../../constants/table-keys";
import type { ListingType } from "../../products/types";

const STORE_PRE_ORDER_TYPES: readonly ListingType[] = ["pre-order"];

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

// Shared with /pre-orders. The local copy also defaulted to -createdAt,
// so a store tab opened Newest-first while the public page opened
// Earliest-Delivery-first for the same data.
const DEFAULT_SORT = PREORDER_PUBLIC_SORT_OPTIONS[0].value;

const FILTER_KEYS = ["minPrice", "maxPrice"];

export interface StorePreOrdersListingProps {
  storeId?: string;
  initialData?: any;
}

export function StorePreOrdersListing({ storeId, initialData }: StorePreOrdersListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get("view") as "grid" | "list") || "grid",
  );

  const { pendingTable, filterActiveCount, onFilterApply, onFilterClear, onResetAll, onFilterReset } =
    usePendingTable(table, FILTER_KEYS);

  const openFilters = useCallback(() => {
    onFilterReset();
    setFilterOpen(true);
  }, [onFilterReset]);

  const applyFilters = useCallback(() => {
    onFilterApply();
    setFilterOpen(false);
  }, [onFilterApply]);

  const resetAll = useCallback(() => {
    onResetAll({ q: "", sort: "" });
    setSearchInput("");
  }, [onResetAll]);

  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== DEFAULT_SORT ||
    filterActiveCount > 0;

  // Absent means "available" — the same default `listStoreProducts`

  // resolves server-side. These six store tabs sent NO availability

  // param at all until 2026-08-24, while their SSR fetch did apply one,

  // so any client refetch silently widened the list (Root Cause #30).

  const availability =

    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||

    AVAILABILITY_VALUES.AVAILABLE;


  const params = {
    q: table.get("q") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    sort: table.get("sort") || DEFAULT_SORT,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    storeId: storeId || undefined,
    listingType: "pre-order" as const,
    availability,
  };

  const { products: preOrders, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const commitSearch = useCallback(() => {
    // table.set("q", v) already resets page to 1 — see root-cause #13.
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  return (
    <Div className="min-h-[200px]">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search store pre-orders..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={PREORDER_PUBLIC_SORT_OPTIONS}
        onSortChange={(v) => {
          table.set("sort", v);
        }}
        view={view}
        onViewChange={(v) => {
          if (v === "table") return;
          setView(v);
          table.set("view", v);
        }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {/* ── Availability scope ───────────────────────────── */}
      <Div padding="y-sm">
        <AvailabilityTabs types={STORE_PRE_ORDER_TYPES} />
      </Div>

      {totalPages > 1 && (
        <StickyToolbar offset="header+pagination" tone="translucent" border padding="toolbar">
          <Row justify="center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
          </Row>
        </StickyToolbar>
      )}

      <Div padding="y-lg">
        {isLoading ? (
          <Grid cols="cards" gap="md">
            {Array.from({ length: 8 }).map((_, i) => (
              <Div
                key={i}
                className="overflow-hidden animate-pulse" border="subtle" rounded="xl"
              >
                <Div className="aspect-square" surface="subtle" />
                <Stack className={`${__P.p3}`} gap="sm">
                  <Div className="h-3 w-3/4" surface="subtle" rounded="default" />
                  <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
                  <Div className="h-8" surface="subtle" rounded="default" />
                </Stack>
              </Div>
            ))}
          </Grid>
        ) : preOrders.length === 0 ? (
          <Text paddingY="3xl" color="muted" size="sm" align="start">
            This store has no pre-orders yet.
          </Text>
        ) : view === "list" ? (
          <Stack className="divide-y divide-zinc-100 divide-[var(--appkit-color-border-subtle)]" border="subtle" rounded="xl">
            {(preOrders as any[]).map((product) => (
              <MarketplacePreorderCard
                key={product.id}
                product={product}
                variant="list"
                hrefBuilder={(p) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id))}
              />
            ))}
          </Stack>
        ) : (
          <Grid cols="cards" gap="md">
            {(preOrders as any[]).map((product) => (
              <MarketplacePreorderCard
                key={product.id}
                product={product}
                variant="grid"
                hrefBuilder={(p) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id))}
              />
            ))}
          </Grid>
        )}
      </Div>

      <FilterDrawer
        open={filterOpen}
        onOpen={openFilters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        onReset={onFilterClear}
        activeCount={filterActiveCount}
        hideTrigger
      >
        <ProductFilters table={pendingTable as any} currencyPrefix="₹" />
      </FilterDrawer>
    </Div>
  );
}
