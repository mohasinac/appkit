"use client";

/**
 * Row-shaping helpers for the seller listing views.
 *
 * The `useSellerListingData` hook that used to live here was deleted: it was
 * a second listing-fetch engine beside `DataListingView`/`useAdminListing`,
 * with its own q/sorts/filters handling, and it had ZERO call sites. Two
 * engines for one job is what this whole investigation was about — the dead
 * one is what the next session copies from.
 *
 * The four helpers below are NOT dead: six seller views import them.
 */

import type { JsonValue } from "@mohasinac/appkit/client";
import { formatCurrency } from "../../../utils/number.formatter";

type UnknownRecord = Record<string, JsonValue>;

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

export function toCurrency(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return formatCurrency(value);
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
