"use client";
import React, { useState, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useEvents } from "../hooks/useEvents";
import { Pagination, SortDropdown } from "../../../ui";
import { EventCard } from "./EventCard";
import { EventFilters, EVENT_PUBLIC_SORT_OPTIONS } from "./EventFilters";
import type { UrlTable } from "../../filters/FilterPanel";

const PAGE_SIZE = 24;

export interface EventsIndexListingProps {
  initialData?: any;
}

export function EventsIndexListing({ initialData }: EventsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: "startsAt" } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);

  const params = {
    q: table.get("q") || undefined,
    page: table.getNumber("page", 1),
    pageSize: table.getNumber("pageSize", PAGE_SIZE),
    sort: table.get("sort") || "startsAt",
    type: table.get("type") || undefined,
    status: table.get("status") || "published",
  };

  const { events, total, totalPages, isLoading } = useEvents(params as any, { initialData });
  const currentPage = table.getNumber("page", 1);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const closeFilters = () => setFilterOpen(false);

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex items-center gap-2.5 max-w-full">

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 dark:border-slate-600 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch()}
              placeholder="Search events..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            <button
              type="button"
              onClick={commitSearch}
              className="flex shrink-0 items-center justify-center px-3 py-2 text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={table.get("sort") || "startsAt"}
              onChange={(v) => { table.set("sort", v); table.setPage(1); }}
              options={EVENT_PUBLIC_SORT_OPTIONS as any}
            />
          </div>
        </div>
      </div>

      {/* ── Event grid ─────────────────────────────────────────────────── */}
      <div className="py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-video bg-zinc-200 dark:bg-slate-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-8 bg-zinc-200 dark:bg-slate-700 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No events found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </div>
        )}
      </div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={closeFilters} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <button type="button" onClick={closeFilters} aria-label="Close filters" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <EventFilters table={table as unknown as UrlTable} variant="public" />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={closeFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
