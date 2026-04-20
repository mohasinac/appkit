/**
 * Shared, React-free column cell renderers.
 *
 * Every renderer returns a `string` (not ReactNode) so it works with
 * `TableColumn<T>.render` in both server and client contexts.
 *
 * For JSX renderers (badge, thumbnail, action buttons) see `column-renderers.tsx`.
 */

import { formatCurrency } from "../../utils/number.formatter";
import {
  getDefaultCurrency,
  getDefaultLocale,
} from "../../core/baseline-resolver";

// --- Boolean ------------------------------------------------------------------

export interface BooleanRenderOpts {
  trueLabel?: string;
  falseLabel?: string;
}

/** Render a boolean as "Yes" / "No" (or custom labels). */
export function renderBoolean(
  value: boolean | null | undefined,
  opts?: BooleanRenderOpts,
): string {
  const trueLabel = opts?.trueLabel ?? "Yes";
  const falseLabel = opts?.falseLabel ?? "No";
  return value ? trueLabel : falseLabel;
}

// --- Currency -----------------------------------------------------------------

/** Render a monetary amount through the shared `formatCurrency` pipeline. */
export function renderCurrency(
  amount: number | null | undefined,
  currency?: string,
  locale?: string,
  fallback = "—",
): string {
  if (amount == null) return fallback;
  return formatCurrency(amount, currency, locale);
}

/**
 * Render a monetary amount as `CURRENCY AMOUNT` (e.g. `INR 1,200`).
 * This matches the existing inline pattern across column modules.
 */
export function renderCurrencyCompact(
  amount: number | null | undefined,
  currency?: string,
  fallback = "—",
): string {
  if (amount == null) return fallback;
  const resolvedCurrency = currency ?? getDefaultCurrency();
  return `${resolvedCurrency} ${amount.toLocaleString()}`;
}

// --- Count --------------------------------------------------------------------

/** Render a numeric value with locale separators, with an optional fallback. */
export function renderCount(
  value: number | null | undefined,
  fallback = "0",
): string {
  if (value == null) return fallback;
  return value.toLocaleString();
}

// --- Nullable -----------------------------------------------------------------

/** Render a nullable value through an optional formatter, with em-dash fallback. */
export function renderNullable<T>(
  value: T | null | undefined,
  format?: (v: T) => string,
  fallback = "—",
): string {
  if (value == null) return fallback;
  return format ? format(value) : String(value);
}

// --- Rating -------------------------------------------------------------------

export type RatingMode = "numeric" | "stars";

export interface RatingRenderOpts {
  mode?: RatingMode;
  maxStars?: number;
  showCount?: boolean;
}

/** Render a rating value as "4.2 (31)" or "★★★★☆". */
export function renderRating(
  rating: number | null | undefined,
  reviewCount?: number | null,
  opts?: RatingRenderOpts,
): string {
  if (rating == null) return "—";

  const mode = opts?.mode ?? "numeric";

  if (mode === "stars") {
    const max = opts?.maxStars ?? 5;
    const filled = Math.round(rating);
    return (
      "★".repeat(Math.min(filled, max)) + "☆".repeat(Math.max(max - filled, 0))
    );
  }

  // numeric
  const base = rating.toFixed(1);
  if (opts?.showCount !== false && reviewCount != null) {
    return `${base} (${reviewCount.toLocaleString()})`;
  }
  return base;
}
