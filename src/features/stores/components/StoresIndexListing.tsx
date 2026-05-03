"use client";
import React, { useState, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useStores } from "../hooks/useStores";
import { Pagination, SortDropdown } from "../../../ui";
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

export interface StoresIndexListingProps {
  initialData?: any;
}

export function StoresIndexListing({ initialData }: StoresIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    table.set("q", "");
  }, [table]);

  // Build sieve filters from URL params for rating, product count, featured
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

  const closeFilters = () => setFilterOpen(false);

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex items-center gap-2.5 max-w-full">

          {/* Filter button */}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 dark:border-slate-600 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Search */}
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <Search className="ml-3 h-4 w-4 flex-shrink-0 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch()}
              placeholder="Search stores…"
              className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="mr-2 flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={commitSearch}
              className="flex shrink-0 items-center justify-center px-3 py-2 text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Sort */}
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={table.get("sort") || "-createdAt"}
              onChange={(v) => { table.set("sort", v); table.setPage(1); }}
              options={STORE_SORT_OPTIONS as any}
            />
          </div>
        </div>

        {/* Result count */}
        {!isLoading && (
          <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            {total} store{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

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

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={table.getNumber("page", 1)}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </div>
        )}
      </div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={closeFilters}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <button
                type="button"
                onClick={closeFilters}
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <StoreFilters table={table as unknown as UrlTable} />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button
                type="button"
                onClick={closeFilters}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
