"use client";

import { useMemo } from "react";
import { usePendingFilters } from "./usePendingFilters";
import type { useUrlTable } from "./useUrlTable";

type UrlTable = ReturnType<typeof useUrlTable>;

/**
 * Minimal UrlTable-compatible interface consumed by *Filters components.
 */
export interface PendingTable {
  get: (key: string) => string;
  set: (key: string, value: string) => void;
  setMany: (updates: Record<string, string>) => void;
}

export interface UsePendingTableReturn {
  /** Drop-in UrlTable replacement that reads/writes to pending state */
  pendingTable: PendingTable;
  /** Count of applied (URL) filter values — use for the filter badge */
  filterActiveCount: number;
  /** Commit all pending changes to the URL (resets page to 1) */
  onFilterApply: () => void;
  /** Clear all filter keys from pending state and URL */
  onFilterClear: () => void;
  /**
   * Revert pending state to the current URL values without clearing them.
   * Call this when opening a filter drawer to ensure it shows the last
   * committed state, even if the URL changed externally (e.g. a status tab).
   */
  onFilterReset: () => void;
}

/**
 * usePendingTable
 *
 * A thin wrapper around `usePendingFilters` that exposes a `pendingTable`
 * object matching the `UrlTable` interface (`get`, `set`, `setMany`).
 *
 * Drop this into any listing view to replace the per-filter `useState` +
 * `handleFilterApply` + `handleFilterClear` boilerplate.
 *
 * @example
 * ```tsx
 * const { pendingTable, filterActiveCount, onFilterApply, onFilterClear } =
 *   usePendingTable(table, ['status', 'category', 'minPrice', 'maxPrice']);
 *
 * // Pass pendingTable directly to any *Filters component:
 * filterContent={<ProductFilters table={pendingTable} showStatus />}
 * filterActiveCount={filterActiveCount}
 * onFilterApply={onFilterApply}
 * onFilterClear={onFilterClear}
 * ```
 */
export function usePendingTable(
  table: UrlTable,
  keys: string[],
): UsePendingTableReturn {
  const filters = usePendingFilters({ table, keys });

  const pendingTable = useMemo<PendingTable>(
    () => ({
      get: (key: string): string => filters.pending[key]?.[0] ?? "",
      set: (key: string, value: string): void => {
        filters.set(key, value ? [value] : []);
      },
      setMany: (updates: Record<string, string>): void => {
        for (const [k, v] of Object.entries(updates)) {
          filters.set(k, v ? [v] : []);
        }
      },
    }),
    [filters.pending, filters.set],
  );

  return {
    pendingTable,
    filterActiveCount: filters.appliedCount,
    onFilterApply: filters.apply,
    onFilterClear: filters.clear,
    onFilterReset: filters.reset,
  };
}
