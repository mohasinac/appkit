"use client"
/**
 * useBulkSelection
 *
 * Generic multi-select state hook for list/table rows.
 * Pairs with any table component that accepts `selectedIds` and
 * `onSelectionChange` props.
 *
 * @example
 * ```tsx
 * const selection = useBulkSelection({ items, keyExtractor: (p) => p.id });
 *
 * <DataTable
 *   selectable
 *   selectedIds={selection.selectedIds}
 *   onSelectionChange={selection.setSelectedIds}
 * />
 * ```
 */

import { useState, useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

/** Default API limit — match the `z.array().max(N)` on your bulk endpoint */
const BULK_MAX_IDS = 100;

export interface UseBulkSelectionOptions<T> {
  /** The current page / list of items being displayed. */
  items: T[];
  /** Extract a stable unique key from each item (e.g. `item => item.id`). */
  keyExtractor: (item: T) => string;
  /**
   * Maximum number of IDs that can be selected at once.
   * @default 100
   */
  maxSelection?: number;
}

export interface UseBulkSelectionReturn {
  selectedIds: string[];
  selectedCount: number;
  /** Returns `true` if the given ID is currently selected. */
  isSelected: (id: string) => boolean;
  /** `true` when every item on the current page is selected. */
  isAllSelected: boolean;
  /**
   * `true` when some — but not all — items are selected.
   * Use to set the indeterminate state on the header checkbox.
   */
  isIndeterminate: boolean;
  /** Toggle one item in or out of the selection. Respects `maxSelection`. */
  toggle: (id: string) => void;
  /**
   * Select all items on the current page (up to `maxSelection`),
   * or deselect all if every item is already selected.
   */
  toggleAll: () => void;
  /** Deselect everything. Call this after a bulk action completes. */
  clearSelection: () => void;
  /**
   * Direct state setter — pass straight to a table's `onSelectionChange`
   * or use when you need to replace the entire selection programmatically.
   */
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
}

export function useBulkSelection<T>({
  items,
  keyExtractor,
  maxSelection = BULK_MAX_IDS,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allIds = useMemo(() => items.map(keyExtractor), [items, keyExtractor]);

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds],
  );

  const toggle = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((s) => s !== id);
        if (prev.length >= maxSelection) return prev;
        return [...prev, id];
      });
    },
    [maxSelection],
  );

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = prev.length === allIds.length && allIds.length > 0;
      if (allSelected) return [];
      return allIds.slice(0, maxSelection);
    });
  }, [allIds, maxSelection]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const isAllSelected =
    allIds.length > 0 && selectedIds.length === allIds.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < allIds.length;

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggle,
    toggleAll,
    clearSelection,
    setSelectedIds,
  };
}
