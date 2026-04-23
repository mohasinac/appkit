"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http";

type UnknownRecord = Record<string, unknown>;

interface UseSellerListingDataOptions<TResponse, TRow extends { id: string }> {
  queryKey: readonly unknown[];
  endpoint: string;
  page?: number;
  pageSize?: number;
  sorts?: string;
  filters?: string;
  mapRows: (response: TResponse) => TRow[];
  getTotal?: (response: TResponse, rows: TRow[]) => number;
}

export interface UseSellerListingDataResult<TRow extends { id: string }> {
  rows: TRow[];
  total: number;
  isLoading: boolean;
  errorMessage?: string;
}

function withQueryParams(endpoint: string, params: Record<string, string>): string {
  const hasQuery = endpoint.includes("?");
  const query = new URLSearchParams(params).toString();
  return `${endpoint}${hasQuery ? "&" : "?"}${query}`;
}

export function useSellerListingData<TResponse, TRow extends { id: string }>({
  queryKey,
  endpoint,
  page = 1,
  pageSize = 25,
  sorts = "-createdAt",
  filters = "",
  mapRows,
  getTotal,
}: UseSellerListingDataOptions<TResponse, TRow>): UseSellerListingDataResult<TRow> {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
    sorts,
  };

  if (filters) {
    params.filters = filters;
  }

  const query = useQuery<TResponse>({
    queryKey: [...queryKey, page, pageSize, sorts, filters],
    queryFn: () =>
      apiClient.get<TResponse>(
        withQueryParams(endpoint, params),
      ),
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
  };
}

export function toRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? (value.filter(Boolean) as UnknownRecord[]) : [];
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
  return `₹${value.toLocaleString("en-IN")}`;
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

  if (deltaMs < minute) return "just now";
  if (deltaMs < hour) return `${Math.floor(deltaMs / minute)}m ago`;
  if (deltaMs < day) return `${Math.floor(deltaMs / hour)}h ago`;
  if (deltaMs < 7 * day) return `${Math.floor(deltaMs / day)}d ago`;

  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}
