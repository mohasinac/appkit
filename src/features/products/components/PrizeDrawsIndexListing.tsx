"use client";
import { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../hooks/useProducts";
import { Div, FilterDrawer, Label, ListingToolbar, Pagination, Row, Select, Stack, Text, StickyToolbar } from "../../../ui";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../hooks/useBrands";
import { MarketplacePrizeDrawCard } from "./MarketplacePrizeDrawCard";
import { ProductFilters } from "./ProductFilters";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { PRIZE_DRAW_SORT_OPTIONS } from "../constants/sieve";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { AvailabilityTabs } from "./AvailabilityTabs";
import type { ListingType } from "../types";

const PRIZE_DRAW_LISTING_TYPES: readonly ListingType[] = ["prize-draw"];

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const DEFAULT_SORT = PRIZE_DRAW_SORT_OPTIONS[0].value;

const FILTER_KEYS = [
  TABLE_KEYS.CATEGORY,
  TABLE_KEYS.BRAND,
  TABLE_KEYS.MIN_PRICE,
  TABLE_KEYS.MAX_PRICE,
  TABLE_KEYS.STORE_ID,
  TABLE_KEYS.PRIZE_REVEAL_STATUS,
];

export interface PrizeDrawsIndexListingProps {
  initialData?: any;
  categorySlug?: string;
  brandName?: string;
  /** When set, the listing is hard-scoped to this store id — overrides URL `storeId`. */
  storeId?: string;
}

export function PrizeDrawsIndexListing({
  initialData,
  categorySlug,
  brandName,
  storeId: forcedStoreId,
}: PrizeDrawsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const availability =
    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||
    AVAILABILITY_VALUES.AVAILABLE;
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );
  const { categories } = useCategoryTree();
  const categoryOptions = categoriesToFacetOptions(categories);
  const { brandOptions } = useBrands();

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
    onResetAll({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.AVAILABILITY]: "" });
    setSearchInput("");
  }, [onResetAll]);

  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    availability !== AVAILABILITY_VALUES.AVAILABLE ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    filterActiveCount > 0;

  const revealFilter = (table.get(TABLE_KEYS.PRIZE_REVEAL_STATUS) || undefined) as
    | "pending"
    | "open"
    | "closed"
    | undefined;

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    category: table.get(TABLE_KEYS.CATEGORY) || undefined,
    categorySlug: categorySlug || undefined,
    brand: brandName || table.get(TABLE_KEYS.BRAND) || undefined,
    minPrice: table.get(TABLE_KEYS.MIN_PRICE) ? Number(table.get(TABLE_KEYS.MIN_PRICE)) : undefined,
    maxPrice: table.get(TABLE_KEYS.MAX_PRICE) ? Number(table.get(TABLE_KEYS.MAX_PRICE)) : undefined,
    storeId: forcedStoreId || table.get(TABLE_KEYS.STORE_ID) || undefined,
    prizeRevealStatus: revealFilter,
    sort: table.get(TABLE_KEYS.SORT) || DEFAULT_SORT,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    perPage: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
    listingType: "prize-draw" as const,
    availability,
  };

  const { products: draws, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  // Closed draws used to be filtered out of the page HERE, client-side, after
  // pagination — which silently shrank the grid below the page size and left
  // `totalPages` counting rows the user could never see. The availability
  // scope does it in the query instead, where the count is computed.
  const filteredDraws = draws as any[];

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[var(--appkit-space-4)]";

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={filterActiveCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search prize draws..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        onSearchKeyDown={handleSearchKeyDown}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={PRIZE_DRAW_SORT_OPTIONS}
        onSortChange={(v) => {
          table.set(TABLE_KEYS.SORT, v);
        }}
        view={view}
        onViewChange={(v) => {
          if (v === VIEW_MODE.TABLE) return;
          setView(v as "grid" | "list");
          table.set(TABLE_KEYS.VIEW, v as "grid" | "list");
        }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {/* ── Availability scope — Available / Ended / All ────────────────── */}
      <Div padding="y-sm">
        <AvailabilityTabs types={PRIZE_DRAW_LISTING_TYPES} />
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
          <Div className={gridClass}>
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
          </Div>
        ) : filteredDraws.length === 0 ? (
          <Text paddingY="3xl" color="muted" size="sm" align="start">
            No prize draws found.
          </Text>
        ) : (
          <Div className={gridClass}>
            {filteredDraws.map((product: any) => (
              <MarketplacePrizeDrawCard
                key={product.id}
                product={product}
                variant={view}
              />
            ))}
          </Div>
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
        <Stack gap="md">
          <>
            <Label htmlFor="prizeRevealStatusFilter" size="xs" weight="semibold" color="muted" className="block mb-1.5">
              Reveal status
            </Label>
            <Select
              id="prizeRevealStatusFilter"
              options={[
                { value: "", label: "Any" },
                { value: "pending", label: "Reveal pending" },
                { value: "open", label: "Reveal open" },
                { value: "closed", label: "Closed" },
              ]}
              value={pendingTable.get(TABLE_KEYS.PRIZE_REVEAL_STATUS) ?? ""}
              onValueChange={(v) =>
                pendingTable.set(TABLE_KEYS.PRIZE_REVEAL_STATUS, v)
              }
            />
          </>
          <ProductFilters
            table={pendingTable as any}
            currencyPrefix="₹"
            categoryOptions={categoryOptions}
            brandOptions={brandOptions}
          />
        </Stack>
      </FilterDrawer>
    </Div>
  );
}
