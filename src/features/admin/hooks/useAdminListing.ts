"use client";

import { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
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
}

export function useAdminListing<TResponse, TRow extends { id: string }>(
  config: AdminListingConfig<TResponse, TRow>,
) {
  const {
    filterKeys,
    defaultSort,
    pageSize = 25,
    queryKey,
    endpoint,
    mapRows,
    getTotal,
    buildFilters,
  } = config;

  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const table = useUrlTable({ defaults: { pageSize: String(pageSize), sort: defaultSort } });
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
    for (const k of filterKeys) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [filterKeys, table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const activeFilterCount = filterKeys.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== defaultSort || activeFilterCount > 0;

  const currentFilterState = Object.fromEntries(filterKeys.map((k) => [k, table.get(k)]));
  const filters = buildFilters(currentFilterState);

  const { rows, total, isLoading, errorMessage, refetch } = useAdminListingData<TResponse, TRow>({
    queryKey,
    endpoint,
    page: table.getNumber("page", 1),
    pageSize,
    sorts: table.get("sort") || defaultSort,
    filters,
    q: table.get("q") || undefined,
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
  };
}

export type AdminListingReturn<TRow extends { id: string }> = ReturnType<typeof useAdminListing<unknown, TRow>>;
