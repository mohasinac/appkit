"use client";
import React, { useState, useCallback, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useStores } from "../hooks/useStores";
import { BulkActionBar, ListingToolbar, Pagination, Text } from "../../../ui";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { ROUTES } from "../../../next";
import { InteractiveStoreCard } from "./InteractiveStoreCard";
import { StoreFilters } from "./StoreFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { STORE_FIELDS } from "../../../constants/field-names";
import { ACTION_ID } from "../../products/constants/action-defs";

const DEFAULT_SORT = sortBy(STORE_FIELDS.CREATED_AT);

const STORE_SORT_OPTIONS = [
  { value: sortBy(STORE_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(STORE_FIELDS.STORE_NAME, "ASC"), label: "Name A–Z" },
  { value: "-itemsSold", label: "Most Sales" },
  { value: "-averageRating", label: "Top Rated" },
] as const;

const FILTER_KEYS = [TABLE_KEYS.CATEGORY, "rating", "minProductCount", "maxProductCount", TABLE_KEYS.FEATURED];

export interface StoresIndexListingProps {
  initialData?: any;
}

export function StoresIndexListing({ initialData }: StoresIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );

  const handleViewToggle = (next: "grid" | "list" | "table") => {
    if (next === VIEW_MODE.TABLE) return;
    setView(next as "grid" | "list");
    table.set(TABLE_KEYS.VIEW, next);
  };

  // Pending filter state — buffered until "Apply Filters" clicked
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const pendingTable = useMemo(() => ({
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
  }), [pendingFilters]) as unknown as UrlTable;

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
    const updates: Record<string, string> = { [TABLE_KEYS.QUERY]: "", [TABLE_KEYS.SORT]: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const pendingFilterCount = FILTER_KEYS.filter((k) => !!pendingFilters[k]).length;
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SORT) !== DEFAULT_SORT ||
    activeFilterCount > 0;

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  // Build sieve filters from applied URL params
  const ratingRaw = table.get(TABLE_KEYS.RATING);
  const minProductCount = table.get("minProductCount");
  const maxProductCount = table.get("maxProductCount");
  const featured = table.get(TABLE_KEYS.FEATURED);

  const filterParts: string[] = [];
  if (ratingRaw) {
    const ratings = ratingRaw.split("|").filter(Boolean);
    if (ratings.length === 1) filterParts.push(`averageRating>=${ratings[0]}`);
  }
  if (minProductCount) filterParts.push(`stats.totalProducts>=${minProductCount}`);
  if (maxProductCount) filterParts.push(`stats.totalProducts<=${maxProductCount}`);
  if (featured === "true") filterParts.push("isFeatured==true");

  const { stores, totalPages, isLoading } = useStores(
    {
      q: table.get(TABLE_KEYS.QUERY) || undefined,
      page: table.getNumber(TABLE_KEYS.PAGE, 1),
      pageSize: table.getNumber(TABLE_KEYS.PAGE_SIZE, 24),
      sort: table.get(TABLE_KEYS.SORT) || undefined,
      category: table.get(TABLE_KEYS.CATEGORY) || undefined,
      filters: filterParts.length > 0 ? filterParts.join(",") : undefined,
    },
    { initialData },
  );

  const selection = useBulkSelection({ items: stores, keyExtractor: (s) => s.id ?? s.storeSlug });

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search stores..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get(TABLE_KEYS.SORT) || DEFAULT_SORT}
        sortOptions={STORE_SORT_OPTIONS}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        bulkMode={selection.isSelecting}
        bulkSelectedCount={selection.selectedCount}
        bulkTotalCount={stores.length}
        onBulkSelectAll={selection.toggleAll}
        onBulkClear={selection.clearSelection}
      />

      {/* ── Bulk action bar ───────────────────────────────────────────── */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            id: ACTION_ID.COMPARE,
            label: "Compare",
            variant: "secondary",
            onClick: () => { selection.clearSelection(); },
          },
          {
            id: "visit",
            label: "Visit Store",
            variant: "primary",
            disabled: selection.selectedCount !== 1,
            onClick: () => { selection.clearSelection(); },
          },
        ] satisfies BulkActionItem[]}
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={table.getNumber("page", 1)}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

      {/* ── Store grid ─────────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-video bg-zinc-200 dark:bg-slate-700" />
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-slate-700" />
                  </div>
                  <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <Text className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No stores found.
          </Text>
        ) : view === "list" ? (
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {stores.map((store) => {
              const storeKey = store.storeSlug ?? store.id;
              return (
                <InteractiveStoreCard
                  key={storeKey}
                  store={store}
                  href={String(ROUTES.PUBLIC.STORE_DETAIL(storeKey))}
                  selectable={selection.isSelecting}
                  isSelected={selection.isSelected(store.id ?? store.storeSlug)}
                  onSelect={(id, sel) => { void sel; selection.toggle(id); }}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => {
              const storeKey = store.storeSlug ?? store.id;
              return (
                <InteractiveStoreCard
                  key={storeKey}
                  store={store}
                  href={String(ROUTES.PUBLIC.STORE_DETAIL(storeKey))}
                  selectable={selection.isSelecting}
                  isSelected={selection.isSelected(store.id ?? store.storeSlug)}
                  onSelect={(id, sel) => { void sel; selection.toggle(id); }}
                />
              );
            })}
          </div>
        )}

      </div>


      {/* ── Filter drawer ──────────────────────────────────────────────── */}
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
                {pendingFilterCount > 0 && (
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
                  className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <StoreFilters table={pendingTable} />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button
                type="button"
                onClick={applyFilters}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]"
              >
                Apply Filters{pendingFilterCount > 0 ? ` (${pendingFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
