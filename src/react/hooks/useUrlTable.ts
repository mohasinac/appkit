"use client";

/**
 * useUrlTable
 *
 * Manages list/table state (filters, sort, pagination, view mode) entirely
 * through URL query params via `router.replace()` — no local state, fully
 * shareable and bookmark-able.
 *
 * Key rules:
 * - `set(key, value)` resets `page` to `'1'` unless the key is `'page'`,
 *   `'pageSize'`, or `'view'`.
 * - `setMany(updates)` resets `page` to `'1'` unless every key in
 *   `updates` is `'page'`, `'pageSize'`, or `'view'`.
 * - Always uses `router.replace()` so filter changes don't pollute history.
 *
 * @example
 * ```tsx
 * const table = useUrlTable({ defaults: { pageSize: '25', sort: '-createdAt' } });
 *
 * // Read
 * table.get('status')        // string | ''
 * table.getNumber('page', 1) // number
 *
 * // Write
 * table.set('status', 'active')   // resets page → 1
 * table.setPage(3)
 * table.setSort('-price')
 * table.setMany({ status: 'active', role: 'seller' })
 *
 * // Build API query strings
 * table.buildSieveParams('status==published')
 * table.buildSearchParams()
 * ```
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface UseUrlTableOptions {
  /** Default param values used when a param is absent from the URL */
  defaults?: Record<string, string>;
}

const NON_RESETTING_KEYS = ["page", "pageSize", "view"] as const;

export function useUrlTable(options?: UseUrlTableOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaults = options?.defaults ?? {};

  const get = useCallback(
    (key: string) => searchParams.get(key) ?? defaults[key] ?? "",
    [searchParams, defaults],
  );

  const getNumber = useCallback(
    (key: string, fallback = 0) => {
      const v = get(key);
      if (!v) return fallback;
      const n = Number(v);
      return isNaN(n) ? fallback : n;
    },
    [get],
  );

  const buildParams = useCallback(
    (updates: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === "" || v === undefined) p.delete(k);
        else p.set(k, v);
      }
      return p;
    },
    [searchParams],
  );

  const set = useCallback(
    (key: string, value: string) => {
      const p = buildParams({ [key]: value });
      if (
        !NON_RESETTING_KEYS.includes(key as (typeof NON_RESETTING_KEYS)[number])
      ) {
        p.set("page", "1");
      }
      router.replace(`${pathname}?${p.toString()}`);
    },
    [buildParams, pathname, router],
  );

  const setMany = useCallback(
    (updates: Record<string, string>) => {
      const p = buildParams(updates);
      const keys = Object.keys(updates);
      const allNonResetting = keys.every((k) =>
        NON_RESETTING_KEYS.includes(k as (typeof NON_RESETTING_KEYS)[number]),
      );
      if (!allNonResetting && !keys.includes("page")) {
        p.set("page", "1");
      }
      router.replace(`${pathname}?${p.toString()}`);
    },
    [buildParams, pathname, router],
  );

  const clear = useCallback(
    (keys?: string[]) => {
      if (keys) {
        const p = new URLSearchParams(searchParams.toString());
        keys.forEach((k) => p.delete(k));
        p.set("page", "1");
        router.replace(`${pathname}?${p.toString()}`);
      } else {
        router.replace(pathname);
      }
    },
    [searchParams, pathname, router],
  );

  const setPage = (page: number) => set("page", String(page));
  const setPageSize = (size: number) => set("pageSize", String(size));
  const setSort = (sort: string) => set("sort", sort);

  const buildSieveParams = useCallback(
    (sieveFilters: string) => {
      const page = get("page") || "1";
      const pageSize = get("pageSize") || defaults["pageSize"] || "25";
      const sort = get("sort") || defaults["sort"] || "-createdAt";
      const parts = new URLSearchParams();
      if (sieveFilters) parts.set("filters", sieveFilters);
      parts.set("sorts", sort);
      parts.set("page", page);
      parts.set("pageSize", pageSize);
      return `?${parts.toString()}`;
    },
    [get, defaults],
  );

  const buildSearchParams = useCallback(() => {
    const p = new URLSearchParams();
    const addIfPresent = (k: string) => {
      const v = get(k);
      if (v) p.set(k, v);
    };
    ["q", "category", "minPrice", "maxPrice"].forEach(addIfPresent);
    p.set("sort", get("sort") || defaults["sort"] || "-createdAt");
    p.set("page", get("page") || "1");
    p.set("pageSize", get("pageSize") || defaults["pageSize"] || "24");
    return `?${p.toString()}`;
  }, [get, defaults]);

  return {
    params: searchParams,
    get,
    getNumber,
    set,
    setMany,
    clear,
    setPage,
    setPageSize,
    setSort,
    buildSieveParams,
    buildSearchParams,
  };
}
