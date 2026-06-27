"use client";
import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../../products/hooks/useProducts";
import { Div, FilterDrawer, ListingToolbar, Pagination, Row, Text } from "../../../ui";
import { DigitalCodeFilters } from "../../digital-codes/components/DigitalCodeFilters";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { ROUTES } from "../../../next";

const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

const SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Price: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Price: High to Low" },
] as const;

const FILTER_KEYS = [TABLE_KEYS.MIN_PRICE, TABLE_KEYS.MAX_PRICE];

export interface StoreDigitalCodesListingProps {
  storeId?: string;
  initialData?: any;
}

export function StoreDigitalCodesListing({ storeId, initialData }: StoreDigitalCodesListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);

  const { pendingTable, filterActiveCount, onFilterApply, onFilterClear, onResetAll, onFilterReset } =
    usePendingTable(table, FILTER_KEYS);

  const openFilters = useCallback(() => { onFilterReset(); setFilterOpen(true); }, [onFilterReset]);
  const applyFilters = useCallback(() => { onFilterApply(); setFilterOpen(false); }, [onFilterApply]);
  const resetAll = useCallback(() => { onResetAll({ q: "", sort: "" }); setSearchInput(""); }, [onResetAll]);

  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || filterActiveCount > 0;

  const params = {
    q: table.get("q") || undefined,
    minPrice: table.get(TABLE_KEYS.MIN_PRICE) ? Number(table.get(TABLE_KEYS.MIN_PRICE)) : undefined,
    maxPrice: table.get(TABLE_KEYS.MAX_PRICE) ? Number(table.get(TABLE_KEYS.MAX_PRICE)) : undefined,
    sort: table.get("sort") || DEFAULT_SORT,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    storeId: storeId || undefined,
    listingType: "digital-code" as const,
  };

  const { products, totalPages, page, isLoading } = useProducts(params as any, { initialData });

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <Div className="min-h-[200px]">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search digital codes…"
        onSearchChange={setSearchInput}
        onSearchCommit={() => table.set("q", searchInput.trim())}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => table.set("sort", v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <Row border="bottom" className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm" surface="default" padding="toolbar" justify="center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </Row>
      )}

      <Div padding="y-lg">
        <Div className={gridClass}>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Div key={i} surface="muted" rounded="xl" className="aspect-square animate-pulse" />)
            : products.length === 0
              ? <Div paddingY="y-4xl" className="col-span-full text-center"><Text color="muted">No digital codes in this store yet.</Text></Div>
              : products.map((p: any) => (
                  <InteractiveProductCard
                    key={p.id}
                    product={p}
                    href={String(ROUTES.PUBLIC.DIGITAL_CODE_DETAIL(p.slug ?? p.id))}
                  />
                ))
          }
        </Div>
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
        <DigitalCodeFilters table={pendingTable as any} currencyPrefix="₹" />
      </FilterDrawer>
    </Div>
  );
}
