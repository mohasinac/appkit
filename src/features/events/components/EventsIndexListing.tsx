"use client";
import React, { useState, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useEvents } from "../hooks/useEvents";
import { Pagination, ListingToolbar } from "../../../ui";
import { EventCard } from "./EventCard";
import { EventFilters, EVENT_PUBLIC_SORT_OPTIONS } from "./EventFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import { EVENT_FIELDS } from "../../../constants/field-names";
import { sieveFilter, sieveMultiEq, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { TABLE_KEYS, VIEW_MODE } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";

const PAGE_SIZE = 24;
const FILTER_KEYS = [TABLE_KEYS.TYPE, TABLE_KEYS.STATUS, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO, TABLE_KEYS.SHOW_EXPIRED];

export interface EventsIndexListingProps {
  initialData?: any;
}

export function EventsIndexListing({ initialData }: EventsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: sortBy(EVENT_FIELDS.STARTS_AT, "ASC") } });
  const [searchInput, setSearchInput] = useState(table.get(TABLE_KEYS.QUERY) || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">(
    (table.get(TABLE_KEYS.VIEW) as "grid" | "list") || VIEW_MODE.GRID,
  );

  const handleViewToggle = (next: "grid" | "list" | "table") => {
    if (next === "table") return;
    setView(next);
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
  const hasActiveState =
    !!table.get(TABLE_KEYS.QUERY) ||
    table.get(TABLE_KEYS.SORT) !== sortBy(EVENT_FIELDS.STARTS_AT, "ASC") ||
    activeFilterCount > 0;

  // Build client-side filter string from URL params
  const typeRaw = table.get(TABLE_KEYS.TYPE);
  const statusRaw = table.get(TABLE_KEYS.STATUS);
  const dateFrom = table.get(TABLE_KEYS.DATE_FROM);
  const dateTo = table.get(TABLE_KEYS.DATE_TO);

  const filterParts: string[] = [];
  if (typeRaw) {
    const types = typeRaw.split("|").filter(Boolean);
    if (types.length === 1) filterParts.push(sieveFilter(EVENT_FIELDS.TYPE, SIEVE_OP.EQ, types[0]));
    // BUG FIX: pipe is invalid for ==; expand to multiple AND clauses
    else if (types.length > 1) filterParts.push(sieveMultiEq(EVENT_FIELDS.TYPE, types));
  }
  if (statusRaw) {
    const statuses = statusRaw.split("|").filter(Boolean);
    if (statuses.length === 1) filterParts.push(sieveFilter(EVENT_FIELDS.STATUS, SIEVE_OP.EQ, statuses[0]));
    else if (statuses.length > 1) filterParts.push(sieveMultiEq(EVENT_FIELDS.STATUS, statuses));
  }
  if (dateFrom) filterParts.push(sieveFilter(EVENT_FIELDS.STARTS_AT, SIEVE_OP.GTE, dateFrom));
  if (dateTo) filterParts.push(sieveFilter(EVENT_FIELDS.ENDS_AT, SIEVE_OP.LTE, dateTo));

  const params = {
    q: table.get(TABLE_KEYS.QUERY) || undefined,
    page: table.getNumber(TABLE_KEYS.PAGE, 1),
    pageSize: table.getNumber(TABLE_KEYS.PAGE_SIZE, PAGE_SIZE),
    sort: table.get(TABLE_KEYS.SORT) || sortBy(EVENT_FIELDS.STARTS_AT, "ASC"),
    filters: filterParts.length > 0 ? sieveAnd(...filterParts) : undefined,
  };

  const { events, total, totalPages, isLoading } = useEvents(params as any, { initialData });
  const currentPage = table.getNumber(TABLE_KEYS.PAGE, 1);

  const commitSearch = useCallback(() => {
    table.set(TABLE_KEYS.QUERY, searchInput.trim());
  }, [searchInput, table]);

  return (
    <div className="min-h-screen">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search events..."
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get(TABLE_KEYS.SORT) || sortBy(EVENT_FIELDS.STARTS_AT, "ASC")}
        sortOptions={EVENT_PUBLIC_SORT_OPTIONS as any}
        onSortChange={(v) => { table.set(TABLE_KEYS.SORT, v); }}
        view={view}
        onViewChange={handleViewToggle}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {/* ── Sticky pagination (below toolbar) ─────────────────────────── */}
      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

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
        ) : view === "list" ? (
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* ── Filter drawer ──────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Filters
              </span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">
                    Clear all
                  </button>
                )}
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <EventFilters table={pendingTable} variant="public" />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
                Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
