"use client";
import React, { useState, useCallback, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useStores } from "../hooks/useStores";
import { Pagination, ListingToolbar } from "../../../ui";
import { ROUTES } from "../../../next";
import { InteractiveStoreCard } from "./InteractiveStoreCard";
import { StoreFilters } from "./StoreFilters";
import type { UrlTable } from "../../filters/FilterPanel";

const STORE_SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "storeName", label: "Name A–Z" },
  { value: "-itemsSold", label: "Most Sales" },
  { value: "-averageRating", label: "Top Rated" },
] as const;

const FILTER_KEYS = ["category", "rating", "minProductCount", "maxProductCount", "featured"];

export interface StoresIndexListingProps {
  initialData?: any;
}

export function StoresIndexListing({ initialData }: StoresIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);

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
    const empty = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));
    setPendingFilters(empty);
    table.setMany({ ...empty, page: "1" });
  }, [table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    table.set("q", "");
    table.setPage(1);
  }, [table]);

  // Build sieve filters from applied URL params
  const ratingRaw = table.get("rating");
  const minProductCount = table.get("minProductCount");
  const maxProductCount = table.get("maxProductCount");
  const featured = table.get("featured");

  const filterParts: string[] = [];
  if (ratingRaw) {
    const ratings = ratingRaw.split("|").filter(Boolean);
    if (ratings.length === 1) filterParts.push(`averageRating>=${ratings[0]}`);
  }
  if (minProductCount) filterParts.push(`stats.totalProducts>=${minProductCount}`);
  if (maxProductCount) filterParts.push(`stats.totalProducts<=${maxProductCount}`);
  if (featured === "true") filterParts.push("isFeatured==true");

  const { stores, total, totalPages, isLoading } = useStores(
    {
      q: table.get("q") || undefined,
      page: table.getNumber("page", 1),
      pageSize: table.getNumber("pageSize", 24),
      sort: table.get("sort") || undefined,
      category: table.get("category") || undefined,
      filters: filterParts.length > 0 ? filterParts.join(",") : undefined,
    },
    { initialData },
  );

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
        sortValue={table.get("sort") || "-createdAt"}
        sortOptions={STORE_SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
        hideViewToggle
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
          <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No stores found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <InteractiveStoreCard
                key={store.storeSlug ?? store.id}
                store={store}
                href={String(ROUTES.PUBLIC.STORE_DETAIL(store.storeSlug ?? store.id))}
              />
            ))}
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
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <StoreFilters table={pendingTable} />
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
