"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http";
import type { JsonValue } from "../../../schemas/types";

/**
 * Listing-row record. Items come from JSON API responses, so values are
 * JsonValue. `toRecordArray()` returns this shape and downstream mappers
 * (e.g. `item.foo`) read fields with JsonValue chaining.
 */
export type ListingItemRecord = Record<string, JsonValue>;

interface UseAdminListingDataOptions<TResponse, TRow extends { id: string }> {
  queryKey: readonly unknown[];
  endpoint: string;
  page?: number;
  pageSize?: number;
  sorts?: string;
  filters?: string;
  q?: string;
  mapRows: (response: TResponse) => TRow[];
  getTotal?: (response: TResponse, rows: TRow[]) => number;
}

export interface UseAdminListingDataResult<TRow extends { id: string }> {
  rows: TRow[];
  total: number;
  isLoading: boolean;
  errorMessage?: string;
  refetch: () => void;
}

function withQueryParams(endpoint: string, params: Record<string, string>): string {
  const hasQuery = endpoint.includes("?");
  const query = new URLSearchParams(params).toString();
  return `${endpoint}${hasQuery ? "&" : "?"}${query}`;
}

export function useAdminListingData<TResponse, TRow extends { id: string }>({
  queryKey,
  endpoint,
  page = 1,
  pageSize = 25,
  sorts = "-createdAt",
  filters,
  q,
  mapRows,
  getTotal,
}: UseAdminListingDataOptions<TResponse, TRow>): UseAdminListingDataResult<TRow> {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
    sorts,
  };
  if (filters) params.filters = filters;
  if (q) params.q = q;

  const query = useQuery<TResponse>({
    queryKey: [...queryKey, page, pageSize, sorts, filters ?? "", q ?? ""],
    queryFn: () =>
      apiClient.get<TResponse>(withQueryParams(endpoint, params)),
    staleTime: 60_000,
  });

  const rows = query.data ? mapRows(query.data) : [];
  const total = query.data
    ? (getTotal?.(query.data, rows) ?? rows.length)
    : rows.length;

  return {
    rows,
    total,
    isLoading: query.isLoading,
    errorMessage:
      query.error instanceof ApiClientError
        ? query.error.message
        : query.error
          ? "Unable to load records"
          : undefined,
    refetch: () => { void query.refetch(); },
  };
}

export function toRecordArray(value: unknown): ListingItemRecord[] {
  return Array.isArray(value) ? (value.filter(Boolean) as ListingItemRecord[]) : [];
}

export function toStringValue(value: unknown, fallback = "-"): string {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

export function toRupees(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `INR ${value.toLocaleString("en-IN")}`;
}

export function toRelativeDate(value: unknown): string {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  const deltaMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (deltaMs < hour) {
    const minutes = Math.max(1, Math.floor(deltaMs / minute));
    return `${minutes}m ago`;
  }

  if (deltaMs < day) {
    const hours = Math.max(1, Math.floor(deltaMs / hour));
    return `${hours}h ago`;
  }

  if (deltaMs < 7 * day) {
    const days = Math.max(1, Math.floor(deltaMs / day));
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  if (value && typeof value === "object") {
    const asRecord = value as { toDate?: () => Date };
    const toDate = asRecord.toDate;
    if (typeof toDate === "function") {
      const parsed = toDate.call(value);
      if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
}
