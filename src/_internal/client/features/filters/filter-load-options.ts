"use client"
/**
 * filter-load-options.ts
 *
 * Factory functions that return `loadOptions(query, page)` callbacks for use
 * with AsyncFacetSection, PaginatedMultiSelect, DynamicSelect, and
 * InlineCreateSelect. Each factory hits a paginated API endpoint and maps the
 * response to { items: DynamicSelectOption[], hasMore: boolean }.
 *
 * Usage:
 *   const load = makeCategoryLoadOptions();
 *   <AsyncFacetSection loadOptions={load} ... />
 */

import type { DynamicSelectOption, AsyncPage } from "../../../../ui/components/DynamicSelect";
import type { FacetOption } from "../../../../features/filters/FilterFacetSection";

export type LoadOptionsFn<T = DynamicSelectOption> = (
  query: string,
  page: number,
) => Promise<AsyncPage<T>>;

const PAGE_SIZE = 25;

function buildUrl(base: string, q: string, page: number, extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...extra,
  });
  return `${base}?${params.toString()}`;
}

async function fetchPage<T>(
  url: string,
  mapItem: (item: Record<string, unknown>) => T,
): Promise<AsyncPage<T>> {
  const res = await fetch(url);
  if (!res.ok) return { items: [], hasMore: false };
  const json = (await res.json()) as {
    data?: {
      items?: unknown[];
      hasMore?: boolean;
      total?: number;
    };
  };
  const raw = json.data?.items ?? [];
  const hasMore = json.data?.hasMore ?? false;
  return {
    items: (raw as Record<string, unknown>[]).map(mapItem),
    hasMore,
  };
}

// ── Categories ────────────────────────────────────────────────────────────────

/**
 * Returns a loadOptions function for categories.
 * @param variant "admin" uses /api/admin/categories; "public" uses /api/categories.
 * @param categoryType Optional filter to narrow to a specific category type (e.g. "brand").
 */
export function makeCategoryLoadOptions(
  variant: "public" | "admin" = "admin",
  categoryType?: string,
): LoadOptionsFn {
  const base = variant === "admin" ? "/api/admin/categories" : "/api/categories";
  return async (q, page) =>
    fetchPage<DynamicSelectOption>(
      buildUrl(base, q, page, categoryType ? { categoryType } : undefined),
      (item) => ({
        value: String(item.id ?? item.slug ?? ""),
        label: String(item.name ?? item.id ?? ""),
        meta: item,
      }),
    );
}

export function makeCategoryFacetLoadOptions(
  variant: "public" | "admin" = "public",
  categoryType?: string,
): LoadOptionsFn<FacetOption> {
  const base = variant === "admin" ? "/api/admin/categories" : "/api/categories";
  return async (q, page) =>
    fetchPage<FacetOption>(
      buildUrl(base, q, page, categoryType ? { categoryType } : undefined),
      (item) => ({
        value: String(item.id ?? item.slug ?? ""),
        label: String(item.name ?? item.id ?? ""),
      }),
    );
}

// ── Brands ────────────────────────────────────────────────────────────────────

export function makeBrandLoadOptions(variant: "public" | "admin" = "admin"): LoadOptionsFn {
  const base = variant === "admin" ? "/api/admin/brands" : "/api/brands";
  return async (q, page) =>
    fetchPage<DynamicSelectOption>(
      buildUrl(base, q, page),
      (item) => ({
        value: String(item.id ?? item.slug ?? ""),
        label: String(item.name ?? item.id ?? ""),
        meta: item,
      }),
    );
}

export function makeBrandFacetLoadOptions(variant: "public" | "admin" = "public"): LoadOptionsFn<FacetOption> {
  const base = variant === "admin" ? "/api/admin/brands" : "/api/brands";
  return async (q, page) =>
    fetchPage<FacetOption>(
      buildUrl(base, q, page),
      (item) => ({
        value: String(item.id ?? item.slug ?? ""),
        label: String(item.name ?? item.id ?? ""),
      }),
    );
}

// ── Stores ────────────────────────────────────────────────────────────────────

export function makeStoreLoadOptions(): LoadOptionsFn {
  return async (q, page) =>
    fetchPage<DynamicSelectOption>(
      buildUrl("/api/admin/stores", q, page),
      (item) => ({
        value: String(item.id ?? item.slug ?? ""),
        label: String(item.storeName ?? item.name ?? item.id ?? ""),
        meta: item,
      }),
    );
}

export function makeStoreFacetLoadOptions(): LoadOptionsFn<FacetOption> {
  return async (q, page) =>
    fetchPage<FacetOption>(
      buildUrl("/api/admin/stores", q, page),
      (item) => ({
        value: String(item.id ?? item.slug ?? ""),
        label: String(item.storeName ?? item.name ?? item.id ?? ""),
      }),
    );
}

// ── Products ──────────────────────────────────────────────────────────────────

export function makeProductLoadOptions(storeId?: string): LoadOptionsFn {
  return async (q, page) =>
    fetchPage<DynamicSelectOption>(
      buildUrl("/api/admin/products", q, page, storeId ? { storeId } : undefined),
      (item) => ({
        value: String(item.id ?? item.slug ?? ""),
        label: String(item.title ?? item.name ?? item.id ?? ""),
        meta: item,
      }),
    );
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function makeUserLoadOptions(role?: string): LoadOptionsFn {
  return async (q, page) =>
    fetchPage<DynamicSelectOption>(
      buildUrl("/api/admin/users", q, page, role ? { role } : undefined),
      (item) => ({
        value: String(item.id ?? item.uid ?? ""),
        label: String(item.displayName ?? item.email ?? item.id ?? ""),
        meta: item,
      }),
    );
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export function makeAddressLoadOptions(ownerType?: "user" | "store"): LoadOptionsFn {
  return async (q, page) =>
    fetchPage<DynamicSelectOption>(
      buildUrl("/api/admin/addresses", q, page, ownerType ? { ownerType } : undefined),
      (item) => ({
        value: String(item.id ?? ""),
        label: [item.label, item.city, item.state].filter(Boolean).join(", "),
        meta: item,
      }),
    );
}
