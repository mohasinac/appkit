import { useCallback, useMemo, useState } from "react";
import type { useUrlTable } from "./useUrlTable";

type UrlTable = ReturnType<typeof useUrlTable>;

export interface UsePendingFiltersOptions {
  /** The page's useUrlTable instance */
  table: UrlTable;
  /** URL param keys to manage (e.g. ['status', 'category', 'role']) */
  keys: string[];
}

export interface UsePendingFiltersReturn {
  /** Current uncommitted selections per key (string[] per key) */
  pending: Record<string, string[]>;
  /** Values currently in the URL (committed) per key */
  applied: Record<string, string[]>;
  /** true when pending differs from applied */
  isDirty: boolean;
  /** Total number of selected values across all pending keys */
  pendingCount: number;
  /** Total number of selected values in the URL (for badge display) */
  appliedCount: number;
  /** Update one key in pending state (does NOT write to URL) */
  set: (key: string, values: string[]) => void;
  /** Write all pending keys to the URL (resets page to 1) */
  apply: () => void;
  /** Discard pending, revert to applied (URL) state */
  reset: () => void;
  /** Clear all keys in both pending state and the URL */
  clear: () => void;
}

/**
 * usePendingFilters
 *
 * Manages local (uncommitted) filter state for a FilterDrawer or any deferred
 * filter panel. Values are only written to the URL when `apply()` is called.
 *
 * Initialised from the current URL params on mount, so opening a drawer
 * pre-fills any already-applied filters.
 *
 * @example
 * ```ts
 * const table   = useUrlTable({ defaults: { pageSize: '25' } });
 * const filters = usePendingFilters({ table, keys: ['status', 'category'] });
 *
 * <FilterDrawer
 *   onApply={() => { filters.apply(); setDrawerOpen(false); }}
 *   onReset={() => filters.clear()}
 *   activeCount={filters.appliedCount}
 * >
 *   <FilterFacetSection
 *     title="Status"
 *     options={STATUS_OPTIONS}
 *     selected={filters.pending['status'] ?? []}
 *     onChange={(v) => filters.set('status', v)}
 *   />
 * </FilterDrawer>
 * ```
 */
export function usePendingFilters({
  table,
  keys,
}: UsePendingFiltersOptions): UsePendingFiltersReturn {
  const parseValues = useCallback(
    (key: string): string[] => {
      const raw = table.get(key);
      return raw ? raw.split(",").filter(Boolean) : [];
    },
    [table],
  );

  const [pending, setPending] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(keys.map((k) => [k, parseValues(k)])),
  );

  const applied = useMemo<Record<string, string[]>>(
    () => Object.fromEntries(keys.map((k) => [k, parseValues(k)])),
    [keys, parseValues],
  );

  const pendingCount = useMemo(
    () => Object.values(pending).reduce((sum, arr) => sum + arr.length, 0),
    [pending],
  );

  const appliedCount = useMemo(
    () => Object.values(applied).reduce((sum, arr) => sum + arr.length, 0),
    [applied],
  );

  const isDirty = useMemo(() => {
    return keys.some((k) => {
      const p = (pending[k] ?? []).slice().sort();
      const a = (applied[k] ?? []).slice().sort();
      return p.length !== a.length || p.some((v, i) => v !== a[i]);
    });
  }, [keys, pending, applied]);

  const set = useCallback((key: string, values: string[]) => {
    setPending((prev) => ({ ...prev, [key]: values }));
  }, []);

  const apply = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of keys) {
      updates[k] = (pending[k] ?? []).join(",");
    }
    table.setMany(updates);
  }, [keys, pending, table]);

  const reset = useCallback(() => {
    setPending(Object.fromEntries(keys.map((k) => [k, parseValues(k)])));
  }, [keys, parseValues]);

  const clear = useCallback(() => {
    const empty = Object.fromEntries(keys.map((k) => [k, [] as string[]]));
    setPending(empty);
    const updates: Record<string, string> = { page: "1" };
    for (const k of keys) updates[k] = "";
    table.setMany(updates);
  }, [keys, table]);

  return {
    pending,
    applied,
    isDirty,
    pendingCount,
    appliedCount,
    set,
    apply,
    reset,
    clear,
  };
}
