"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { useDataViewMode } from "../../account/hooks/useDataViewMode";
import { useAdminListingData } from "./useAdminListingData";

export interface AdminListingConfig<TResponse, TRow extends { id: string }> {
  filterKeys: string[];
  defaultSort: string;
  pageSize?: number;
  queryKey: readonly unknown[];
  endpoint: string;
  mapRows: (response: TResponse) => TRow[];
  getTotal?: (response: TResponse, rows: TRow[]) => number;
  buildFilters: (filterState: Record<string, string>) => string | undefined;
  /**
   * Extra query params derived from the same filter state, for endpoints whose
   * filter can't be expressed as a Sieve string. Use `buildFilters` for
   * anything Sieve *can* express — this is the escape hatch, not the default.
   */
  buildExtraParams?: (
    filterState: Record<string, string>,
  ) => Record<string, string | undefined> | undefined;
  initialView?: "grid" | "list" | "table";
  /** Values used for filterKeys absent from the URL — lets a view default to
   * a non-"All" filter state (e.g. hide inactive rows) on first load, while
   * "Clear filters" (which writes an explicit "") still shows everything. */
  filterDefaults?: Record<string, string>;
  /**
   * When a typed term reaches the URL. `"enter"` (the default) is what every
   * box already did — commit on Enter or the button, never on keystroke.
   *
   * Passed down from `ListingViewConfig.search.commit`; see the 🛑 there for
   * why `"debounce"` is invalid with `mode: "exact"`.
   */
  searchCommit?: "enter" | "debounce";
  searchDebounceMs?: number;
}

export function useAdminListing<TResponse, TRow extends { id: string }>(
  config: AdminListingConfig<TResponse, TRow>,
) {
  const {
    filterKeys,
    defaultSort,
    pageSize: defaultPageSize = 25,
    queryKey,
    endpoint,
    mapRows,
    getTotal,
    buildFilters,
    buildExtraParams,
    filterDefaults = {},
    searchCommit = "enter",
    searchDebounceMs = 350,
  } = config;

  // Persisted, viewport-aware view-mode: below 768px defaults to "list"
  // (AdminViewCards' one-full-width-card-per-row layout) unless the caller
  // explicitly pins hideTableView (grid-only views like coupons); the user's
  // own explicit choice, once made, always wins and persists across visits.
  const { view, setView } = useDataViewMode(config.initialView ?? "list");
  const table = useUrlTable({
    defaults: { pageSize: String(defaultPageSize), sort: defaultSort, ...filterDefaults },
  });
  // Reactive — table.getNumber reads the URL param, so a page-size selector
  // (Pagination's pageSize/onPageSizeChange) actually takes effect instead
  // of always falling back to the static config default.
  const pageSize = table.getNumber("pageSize", defaultPageSize);
  const setPageSize = useCallback(
    (next: number) => table.setMany({ pageSize: String(next), page: "1" }),
    [table],
  );
  const panel = usePanelUrlSync();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(filterKeys.map((k) => [k, table.get(k)])),
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(filterKeys.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [filterKeys, table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of filterKeys) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [filterKeys, pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(filterKeys.map((k) => [k, ""])));
  }, [filterKeys]);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { q: "", sort: "" };
    // Restore each key to its CONFIGURED default, not to "". A view using
    // `filterDefaults` (e.g. hide-inactive on first load) would otherwise have
    // "Reset" land somewhere the user could never get back to by reloading —
    // reset showed MORE rows than a fresh visit, which reads as a bug in the
    // filter rather than in the reset.
    for (const k of filterKeys) updates[k] = filterDefaults?.[k] ?? "";
    table.setMany(updates);
    setSearchInput("");
  }, [filterKeys, filterDefaults, table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  // Debounced commit, opt-in per view.
  //
  // Two things here are load-bearing:
  //
  // 1. It compares against what is ALREADY in the URL and skips a no-op.
  //    `table.set` issues a router.replace, and replacing the URL with the
  //    value it already holds re-runs the query for nothing — on mount, on
  //    every unrelated re-render, and on the render caused by the previous
  //    commit. That is the double-navigation shape of Root Cause #13.
  //
  // 2. The timer is cleared on every keystroke AND on unmount, so a term is
  //    never committed by a view the user has already navigated away from.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committed = table.get("q") ?? "";
  useEffect(() => {
    if (searchCommit !== "debounce") return;
    const next = searchInput.trim();
    if (next === committed) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => table.set("q", next), searchDebounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, committed, searchCommit, searchDebounceMs, table]);

  const activeFilterCount = filterKeys.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== defaultSort || activeFilterCount > 0;

  const currentFilterState = Object.fromEntries(filterKeys.map((k) => [k, table.get(k)]));
  const filters = buildFilters(currentFilterState);
  const extraParams = buildExtraParams?.(currentFilterState);

  const { rows, total, isLoading, errorMessage, refetch } = useAdminListingData<TResponse, TRow>({
    queryKey,
    endpoint,
    page: table.getNumber("page", 1),
    pageSize,
    sorts: table.get("sort") || defaultSort,
    filters,
    q: table.get("q") || undefined,
    extraParams,
    mapRows,
    getTotal,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / pageSize);
  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  return {
    view, setView,
    table,
    panel,
    searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters,
    activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage, refetch,
    currentPage, totalPages,
    selection,
    defaultSort,
    pageSize,
    setPageSize,
  };
}

export type AdminListingReturn<TRow extends { id: string }> = ReturnType<typeof useAdminListing<unknown, TRow>>;
