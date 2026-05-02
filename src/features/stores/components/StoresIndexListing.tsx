"use client";
import React from "react";
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

  const { stores, total, totalPages, isLoading } = useStores(
    {
      page: table.getNumber("page", 1),
      pageSize: table.getNumber("pageSize", 24),
      sort: table.get("sort") || undefined,
      category: table.get("category") || undefined,
    },
    { initialData },
  );

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex items-center justify-end gap-2.5 max-w-full">
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={table.get("sort") || "-createdAt"}
              onChange={(v) => { table.set("sort", v); table.setPage(1); }}
              options={STORE_SORT_OPTIONS as any}
            />
          </div>
        </div>
      </div>

      {/* ── Store grid ─────────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-video bg-zinc-200 dark:bg-slate-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
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
    </div>
  );
}
