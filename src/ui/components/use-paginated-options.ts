"use client";

/*
 * WHY: `PaginatedSelect` was 459 significant lines and `audit-code-quality`
 *      blocks a component above 150. The bulk of it was never rendering — it
 *      was an async option-loading state machine: seven pieces of state, a
 *      monotonic request guard, a debounce, and a label-resolution pass, all
 *      sitting above the JSX that actually draws the control.
 *
 * WHAT: That machine, as a hook. No JSX moved, so every call site of
 *       `PaginatedSelect` is untouched.
 *
 * ## 🛑 Two invariants that are easy to lose in a refactor
 *
 * 1. **A failed load is NOT "no results".** `load` once had `try`/`finally`
 *    with no `catch`, so a rejected `loadOptions` left the list untouched and
 *    the dropdown rendered "No results" — reporting a 500 as a measured zero.
 *    That is what made a missing Firestore composite index on the category
 *    picker look like an empty taxonomy. `loadError` exists so the control
 *    can say "could not load" instead of "nothing matched".
 *
 * 2. **`requestIdRef` guards ordering, on BOTH paths.** A slower earlier
 *    request — for a search term the user has already abandoned — must never
 *    overwrite state a faster, newer request already set. The failure path
 *    needs the same guard as the success path, or a superseded request paints
 *    its error over current results.
 *
 * EXPORTS: usePaginatedOptions, UsePaginatedOptionsResult
 *
 * @tag domain:ui
 * @tag layer:hook
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:PaginatedSelect
 * @tag sideEffects:network
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeError } from "../../errors/normalize";
import type { AsyncPage, PaginatedSelectOption } from "./PaginatedSelect";

export interface UsePaginatedOptionsResult<V> {
  query: string;
  setQuery: (q: string) => void;
  asyncOptions: PaginatedSelectOption<V>[];
  setAsyncOptions: React.Dispatch<React.SetStateAction<PaginatedSelectOption<V>[]>>;
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadError: string | null;
  /** `value -> label`, seeded by every load so a selected id can render a name. */
  labelMap: React.MutableRefObject<Map<V, string>>;
  /**
   * Record a label AND re-render.
   *
   * 🛑 The pair is the point. `labelMap` is a ref, so writing to it alone
   * changes what the trigger WOULD render without causing it to render — the
   * new name appears only on the next unrelated update. Every caller that
   * learns a label (a create, an edit) needs both, so the hook does both
   * rather than exposing the version counter for each one to remember.
   */
  setLabel: (value: V, label: string) => void;
  load: (search: string, nextPage: number, reset?: boolean) => Promise<void>;
}

export function usePaginatedOptions<V>(
  loadOptions: ((query: string, page: number) => Promise<AsyncPage<PaginatedSelectOption<V>>>) | undefined,
  open: boolean,
  selectedValues: V[],
): UsePaginatedOptionsResult<V> {
  const [query, setQuery] = useState("");
  const [asyncOptions, setAsyncOptions] = useState<PaginatedSelectOption<V>[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const labelMap = useRef<Map<V, string>>(new Map());
  const requestIdRef = useRef(0);
  const wasOpenRef = useRef(false);

  const load = useCallback(
    async (search: string, nextPage: number, reset = false) => {
      if (!loadOptions) return;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const response = await loadOptions(search, nextPage);
        // A newer request (new search, or the dropdown reopened) was issued
        // while this one was in flight — its response is stale, discard it
        // rather than clobbering state a more recent request already set.
        if (requestId !== requestIdRef.current) return;
        setAsyncOptions((prev) => {
          const merged = reset ? response.items : [...prev, ...response.items];
          merged.forEach((o) => labelMap.current.set(o.value, o.label));
          return merged;
        });
        setPage(nextPage);
        setHasMore(response.hasMore);
      } catch (err) {
        const normalized = normalizeError(err);
        // Same staleness rule as the success path: a superseded request must
        // not paint its failure over a newer request's results.
        if (requestId === requestIdRef.current) {
          setLoadError(normalized.message || "Could not load options.");
          if (reset) setAsyncOptions([]);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [loadOptions],
  );

  useEffect(() => {
    if (!open || !loadOptions) {
      wasOpenRef.current = false;
      return;
    }
    // Load immediately the moment the dropdown opens; debounce subsequent
    // reloads triggered by the user typing so every keystroke doesn't fire
    // a new request.
    const isFreshOpen = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (isFreshOpen) {
      void load(query, 1, true);
      return;
    }
    const timer = setTimeout(() => {
      void load(query, 1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, query, load, loadOptions]);

  /*
   * Resolve the LABEL for an already-selected value, so a closed control shows
   * a name rather than a raw id. A control whose value is null (a create form)
   * or whose label is already known fetches nothing. It seeds `labelMap` alone
   * and never touches `asyncOptions`, so it cannot race the dropdown's own
   * list or its search.
   */
  const [labelVersion, setLabelVersion] = useState(0);
  const labelResolveRef = useRef(false);
  const unresolvedKey = selectedValues
    .filter((v) => !labelMap.current.has(v))
    .map((v) => String(v))
    .join(" ");

  useEffect(() => {
    if (!loadOptions || !unresolvedKey || labelResolveRef.current) return;
    labelResolveRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const response = await loadOptions("", 1);
        if (cancelled) return;
        response.items.forEach((o) => labelMap.current.set(o.value, o.label));
        setLabelVersion((n) => n + 1);
        // audit-silent-degrade-ok: this effect only ever UPGRADES the trigger from
        // the raw id to a display name. On failure it keeps the id — the behaviour
        // every caller had before it existed — and the control stays fully operable,
        // since opening the dropdown re-loads options through `load`, which surfaces
        // its own errors. There is nothing here a user or an operator could act on.
      } catch (err) {
        void normalizeError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOptions, unresolvedKey]);
  void labelVersion; // re-render trigger only; the labels live in labelMap

  const setLabel = useCallback((value: V, label: string) => {
    labelMap.current.set(value, label);
    setLabelVersion((n) => n + 1);
  }, []);

  return {
    query,
    setQuery,
    asyncOptions,
    setAsyncOptions,
    page,
    hasMore,
    loading,
    loadError,
    labelMap,
    setLabel,
    load,
  };
}
