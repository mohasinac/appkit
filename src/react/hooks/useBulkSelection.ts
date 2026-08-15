"use client"

import { useState, useCallback, useMemo } from "react";

/** Default API limit — match the `z.array().max(N)` on your bulk endpoint */
const BULK_MAX_IDS = 100;

export interface UseBulkSelectionOptions<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  maxSelection?: number;
}

export interface UseBulkSelectionReturn {
  /** Stable array of selected IDs — for backward-compat serialisation / API calls. */
  selectedIds: string[];
  /** O(1) membership set — prefer this over `selectedIds.includes()` in render. */
  selectedIdSet: Set<string>;
  selectedCount: number;
  /** `true` when at least one item is selected — drives selection-mode UI. */
  isSelecting: boolean;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  /** Replace entire selection programmatically. */
  setSelectedIds: (ids: string[]) => void;
}

export function useBulkSelection<T>({
  items,
  keyExtractor,
  maxSelection = BULK_MAX_IDS,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set());

  const allIds = useMemo(() => items.map(keyExtractor), [items, keyExtractor]);

  const toggle = useCallback((id: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxSelection) {
        next.add(id);
      }
      return next;
    });
  }, [maxSelection]);

  const toggleAll = useCallback(() => {
    setSelectedSet((prev) => {
      // Compare actual membership, not just set size — `prev` can hold IDs
      // from a page that's no longer rendered (e.g. after paginating), in
      // which case the sizes coincidentally matching would wrongly report
      // "all selected" and CLEAR the selection instead of selecting the
      // currently-visible items.
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allIds.slice(0, maxSelection));
    });
  }, [allIds, maxSelection]);

  const clearSelection = useCallback(() => setSelectedSet(new Set()), []);

  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedSet(new Set(ids.slice(0, maxSelection)));
  }, [maxSelection]);

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const selectedIds = useMemo(() => Array.from(selectedSet), [selectedSet]);
  const selectedCount = selectedSet.size;
  const isSelecting = selectedCount > 0;
  // Membership-based, not cardinality-based — `selectedSet` can hold IDs
  // from items that are no longer in `allIds` (e.g. the previous page),
  // so comparing sizes alone can report "all selected" when none of the
  // *currently rendered* rows are actually selected.
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const isIndeterminate = !isAllSelected && allIds.some((id) => selectedSet.has(id));

  return {
    selectedIds,
    selectedIdSet: selectedSet,
    selectedCount,
    isSelecting,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggle,
    toggleAll,
    clearSelection,
    setSelectedIds,
  };
}
