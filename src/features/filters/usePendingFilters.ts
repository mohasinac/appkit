"use client"
import { useState, useCallback, useMemo } from "react";
import type { UrlTable } from "./FilterPanel";

/**
 * usePendingFilters — deferred apply pattern for filter panels.
 *
 * Maintains a local "staging" copy of filter values. Changes write only to
 * the staging table; nothing is committed to the URL/state until `commit()`
 * is called (e.g. when the user clicks "Apply Filters").
 *
 * Usage:
 *   const { stagingTable, pendingCount, commit, reset } = usePendingFilters({
 *     initial: currentUrlParams,
 *     onCommit: (values) => router.push(buildUrl(values)),
 *   });
 *   // Pass stagingTable to <FilterPanel table={stagingTable} />
 *   // Pass pendingCount to filterPendingCount prop of ListingLayout
 *   // Call commit() from onFilterApply
 *   // Call reset() from onFilterClear
 */

export interface UsePendingFiltersOptions {
  /** Current committed filter values (URL params / server state snapshot). */
  initial: Record<string, string>;
  /** Called with the full staged values when the user commits. */
  onCommit: (values: Record<string, string>) => void;
}

export interface UsePendingFiltersResult {
  /** UrlTable backed by staging state — pass to FilterPanel / FilterFacetSection. */
  stagingTable: UrlTable;
  /** Number of keys that differ between staged and committed values. */
  pendingCount: number;
  /** Flush staged values to committed via onCommit. */
  commit: () => void;
  /** Revert staged values back to the last committed snapshot. */
  reset: () => void;
  /** Current staged values (read-only snapshot). */
  staged: Record<string, string>;
}

export function usePendingFilters({
  initial,
  onCommit,
}: UsePendingFiltersOptions): UsePendingFiltersResult {
  const [staged, setStaged] = useState<Record<string, string>>({ ...initial });

  const stagingTable: UrlTable = useMemo(
    () => ({
      get: (key: string) => staged[key] ?? "",
      set: (key: string, value: string) =>
        setStaged((prev) => ({ ...prev, [key]: value })),
      setMany: (updates: Record<string, string>) =>
        setStaged((prev) => ({ ...prev, ...updates })),
    }),
    [staged],
  );

  const pendingCount = useMemo(() => {
    const allKeys = new Set([...Object.keys(staged), ...Object.keys(initial)]);
    let count = 0;
    for (const key of allKeys) {
      if ((staged[key] ?? "") !== (initial[key] ?? "")) count++;
    }
    return count;
  }, [staged, initial]);

  const commit = useCallback(() => onCommit(staged), [onCommit, staged]);
  const reset = useCallback(() => setStaged({ ...initial }), [initial]);

  return { stagingTable, pendingCount, commit, reset, staged };
}
