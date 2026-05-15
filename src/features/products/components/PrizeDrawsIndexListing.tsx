"use client";
import { useState, useCallback, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import { Pagination, ListingToolbar } from "../../../ui";
import { useCategoryTree, categoriesToFacetOptions } from "../../categories/hooks/useCategoryTree";
import { useBrands } from "../hooks/useBrands";
import { MarketplacePrizeDrawCard } from "./MarketplacePrizeDrawCard";
import { ProductFilters } from "./ProductFilters";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

const PRIZE_DRAW_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_START, "ASC"), label: "Reveal: Soonest" },
  { value: sortBy(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_START), label: "Reveal: Furthest" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Entry: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Entry: High to Low" },
] as const;

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

  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const pendingTable = useMemo(
    () =>
      ({
        get: (key: string) => pendingFilters[key] ?? "",
        getNumber: (key: string, fallback = 0) => {
          const v = pendingFilters[key];
          if (!v) return fallback;
          const n = Number(v);
          return isNaN(n) ? fallback : n;
        },
        set: (key: string, value: string) =>
          setPendingFilters((p) => ({ ...p, [key]: value })),
        setMany: (updates: Record<string, string>) =>
          setPendingFilters((p) => ({ ...p, ...updates })),
        clear: (keys?: string[]) => {
          const ks = keys ?? FILTER_KEYS;
          setPendingFilters((p) => ({
            ...p,
            ...Object.fromEntries(ks.map((k) => [k, ""])),
          }));
        },
        setPage: (_: number) => {},
        setPageSize: (_: number) => {},
        setSort: (_: string) => {},
        buildSieveParams: () => "",
        buildSearchParams: () => "",
        params: new URLSearchParams(),
      }) as any,
    [pendingFilters],
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "", [TABLE_KEYS.SHOW_CLOSED]: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    showClosed ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    activeFilterCount > 0;

  const revealFilter = (table.get(TABLE_KEYS.PRIZE_REVEAL_STATUS) || undefined) as "pending" | "open" | "closed" | undefined;

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
  const filteredDraws = !revealFilter && !showClosed
    ? (draws as any[]).filter((d) => d.prizeRevealStatus !== PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.CLOSED)
    : (draws as any[]);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
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
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <span className="hidden sm:inline text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
              Show closed
            </span>
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
          </label>
        }
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

      <div className="py-6">
        {isLoading ? (
          <div className={gridClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-zinc-200 dark:bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-8 bg-zinc-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDraws.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No prize draws found.
          </p>
        ) : (
          <div className={gridClass}>
            {filteredDraws.map((product: any) => (
              <MarketplacePrizeDrawCard
                key={product.id}
                product={product}
                variant={view}
              />
            ))}
          </div>
        )}
      </div>

      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  aria-label="Close filters"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div>
                <label
                  htmlFor="prizeRevealStatusFilter"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Reveal status
                </label>
                <select
                  id="prizeRevealStatusFilter"
                  value={pendingFilters.prizeRevealStatus ?? ""}
                  onChange={(e) =>
                    setPendingFilters((p) => ({
                      ...p,
                      prizeRevealStatus: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
                >
                  <option value="">Any</option>
                  <option value="pending">Reveal pending</option>
                  <option value="open">Reveal open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <ProductFilters
                table={pendingTable}
                currencyPrefix="₹"
                categoryOptions={categoryOptions}
                brandOptions={brandOptions}
              />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button
                type="button"
                onClick={applyFilters}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]"
              >
                Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
