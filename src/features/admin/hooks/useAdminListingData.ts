"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http";
import type { JsonValue } from "../../../schemas/types";
import { formatCurrency } from "../../../utils/number.formatter";

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
  /**
   * Extra query-string params appended verbatim, for listing endpoints whose
   * filter isn't expressible as a Sieve string (e.g. the admin orders
   * payment-review queue, which keys off the *absence* of a field). Keys with
   * an `undefined` value are dropped. Participates in the react-query key, so
   * changing one refetches rather than serving another mode's cached page.
   */
  extraParams?: Record<string, string | undefined>;
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
  extraParams,
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
  const extraEntries = Object.entries(extraParams ?? {})
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of extraEntries) params[key] = value;

  const query = useQuery<TResponse>({
    // extraEntries is sorted so an identical param set always produces an
    // identical key regardless of object insertion order.
    queryKey: [...queryKey, page, pageSize, sorts, filters ?? "", q ?? "", extraEntries],
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

export function toCurrency(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return formatCurrency(value);
}

/**
 * A timestamp as human-relative text — **in either direction**.
 *
 * 🛑 **Every FUTURE date used to render as "1m ago".** `deltaMs` is
 * `now - date`, which is negative ahead of now; `deltaMs < hour` then matched,
 * and `Math.max(1, Math.floor(negative))` clamped the result to exactly `1`.
 * So a deadline 48 hours away and one 5 minutes away both read "1m ago", and
 * the clamp is what hid it — without it the string would have been
 * "-2880m ago", which nobody could have mistaken for working.
 *
 * Measured live on `/store/offers` as tyson@beybladearena.in: an offer accepted
 * seconds earlier showed **"Buyer must pay by 1m ago"** against a real
 * `checkoutDeadline` of `now + 48h` (`OFFER_CHECKOUT_WINDOW_MS`). The data was
 * correct and the sentence told the seller — and on the admin view, the admin —
 * that a buyer had already missed a window that had barely opened. On the
 * buyer's own side that reads as "too late to pay for the thing you just
 * negotiated", i.e. an abandoned purchase caused entirely by a formatter.
 *
 * Five call sites render a future-capable field today (offer `expiresAt` and
 * `checkoutDeadline` on both the seller and admin views, and session
 * `expiresAt`), and any of the other 61 becomes one the moment its field can
 * hold a future date — which is why this is fixed here rather than at the call
 * sites.
 *
 * The `Math.max(1, …)` floors stay for the PAST direction: they keep a
 * 40-second-old row reading "1m ago" instead of "0m ago". They are applied to
 * an absolute magnitude now, so they can no longer mask a sign error.
 *
 * NOTE ON ITS HOME: a pure date formatter belongs in `ui/` or
 * `_internal/client/`, not in an admin hook module that 44 files reach into.
 * Moving it means rewriting all 44 imports, so it stays put for now and the
 * seller-side duplicate was deleted instead (see `useSellerListingData.ts`) —
 * that copy had already drifted, returning "just now" for the same future date
 * this one called "1m ago". Two answers to one question is the whole argument.
 */
export function toRelativeDate(value: unknown): string {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  const deltaMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const future = deltaMs < 0;
  const magnitude = Math.abs(deltaMs);
  // "in 3h" vs "3h ago" — the only difference between the two directions.
  const phrase = (n: number, unit: string) => (future ? `in ${n}${unit}` : `${n}${unit} ago`);

  if (magnitude < hour) {
    return phrase(Math.max(1, Math.floor(magnitude / minute)), "m");
  }

  if (magnitude < day) {
    return phrase(Math.max(1, Math.floor(magnitude / hour)), "h");
  }

  if (magnitude < 7 * day) {
    return phrase(Math.max(1, Math.floor(magnitude / day)), "d");
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
