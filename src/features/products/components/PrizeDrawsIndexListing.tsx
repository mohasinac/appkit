"use client";
import { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePendingTable } from "../../../react/hooks/usePendingTable";
import { useProducts } from "../hooks/useProducts";
import { Div, FilterDrawer, Label, ListingToolbar, Pagination, Row, Span, Stack, Text } from "../../../ui";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../hooks/useBrands";
import { MarketplacePrizeDrawCard } from "./MarketplacePrizeDrawCard";
import { ProductFilters } from "./ProductFilters";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { PRIZE_DRAW_SORT_OPTIONS } from "../constants/sieve";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

const __P = {
  p3: "p-3",
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
  const showClosed = table.get(TABLE_KEYS.SHOW_CLOSED) === "true";
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
    onResetAll({ [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.SHOW_CLOSED]: "" });
    setSearchInput("");
  }, [onResetAll]);

  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    showClosed ||
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
  };

  const { products: draws, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  // When no explicit reveal-status filter is set, hide closed draws client-side
  // as a UX default (showClosed toggle). Server handles explicit status filters.
  const filteredDraws =
    !revealFilter && !showClosed
      ? (draws as any[]).filter(
          (d) => d.prizeRevealStatus !== PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.CLOSED,
        )
      : (draws as any[]);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

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
        extra={
          <Label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <Span size="xs" className="hidden sm:inline whitespace-nowrap" color="muted">
              Show closed
            </Span>
            <button
              type="button"
              role="switch"
              aria-checked={showClosed}
              onClick={() => table.set("showClosed", showClosed ? "" : "true")}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                showClosed ? "bg-primary" : "bg-zinc-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  showClosed ? "translate-x-[19px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </Label>
        }
      />

      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm border-b border-zinc-200 py-1.5" surface="default" padding="x-sm" justify="center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Row>
      )}

      <Div padding="y-lg">
        {isLoading ? (
          <Div className={gridClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Div
                key={i}
                className="dark:border-slate-700 overflow-hidden animate-pulse" border="subtle" rounded="xl"
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
          <Text className="py-12" color="muted" size="sm" align="center">
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
            <label
              htmlFor="prizeRevealStatusFilter"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Reveal status
            </label>
            <select
              id="prizeRevealStatusFilter"
              value={pendingTable.get(TABLE_KEYS.PRIZE_REVEAL_STATUS) ?? ""}
              onChange={(e) =>
                pendingTable.set(TABLE_KEYS.PRIZE_REVEAL_STATUS, e.target.value)
              }
              className="w-full rounded border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              <option value="pending">Reveal pending</option>
              <option value="open">Reveal open</option>
              <option value="closed">Closed</option>
            </select>
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
