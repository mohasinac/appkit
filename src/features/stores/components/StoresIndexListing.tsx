"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useStores } from "../hooks/useStores";
import { Pagination, SortDropdown } from "../../../ui";
import { ROUTES } from "../../../next";
import { InteractiveStoreCard } from "./InteractiveStoreCard";

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
  const [searchInput, setSearchInput] = useState("");

  const { stores, total, totalPages, isLoading } = useStores(
    {
      page: table.getNumber("page", 1),
      pageSize: table.getNumber("pageSize", 24),
      sort: table.get("sort") || undefined,
      category: table.get("category") || undefined,
    },
    { initialData },
  );

  const clearSearch = useCallback(() => setSearchInput(""), []);

  // Client-side name filter within current page
  const filtered = useMemo(() => {
    if (!searchInput.trim()) return stores;
    const q = searchInput.trim().toLowerCase();
    return stores.filter((s) => s.storeName.toLowerCase().includes(q));
  }, [stores, searchInput]);

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex items-center gap-2.5 max-w-full">

          {/* Search */}
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <Search className="ml-3 h-4 w-4 flex-shrink-0 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
            {searchInput
              ? `${filtered.length} of ${total} stores`
              : `${total} store${total !== 1 ? "s" : ""}`}
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
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {searchInput ? `No stores match "${searchInput}"` : "No stores found."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((store) => (
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
              onPageChange={(p) => { setSearchInput(""); table.setPage(p); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
