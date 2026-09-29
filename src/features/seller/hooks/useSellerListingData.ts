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

/*
 * 🛑 `toRelativeDate` WAS HERE AND IS GONE. Import it from
 * `features/admin/hooks/useAdminListingData` — the defining module now, and
 * the one 44 files already use (Root Cause #18: import from where a symbol is
 * defined, never from a convenience copy).
 *
 * This copy had drifted from that one and the drift was live: for a FUTURE
 * date, `deltaMs` is negative, so `deltaMs < minute` matched and this version
 * answered **"just now"** while the admin version answered **"1m ago"** — two
 * different wrong answers to "when is this deadline", depending on which file
 * a view happened to import from. The admin one is fixed to say "in 48h"; a
 * second implementation is how that fix would have been half-applied.
 *
 * The three sibling helpers below are also duplicated there. They are left
 * alone deliberately: none of them is wrong, and collapsing them is an import
 * rewrite across both feature trees rather than a bug fix.
 */

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
