/**
 * Shared, React-free column cell renderers.
 *
 * Every renderer returns a `string` (not ReactNode) so it works with
 * `TableColumn<T>.render` in both server and client contexts.
 *
 * For JSX renderers (status badge, thumbnail, avatar, money, relative date,
 * boolean icon, count pill, type chip) see `cell-renderers.tsx`.
 *
 * NOTE: that sibling was called `column-renderers.tsx` here for months and was
 * never written, because it cannot be: `.ts` and `.tsx` of the same basename
 * both emit `column-renderers.js` (TS5056). Hence the distinct name.
 */

import { formatCurrency } from "../../utils/number.formatter";
import { getDefaultCurrency } from "../../core/baseline-resolver";

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

// --- Status tone ----------------------------------------------------------------

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

/**
 * Normalizes the wide variety of status-string values used across
 * collections (order status, product status, payout status, ban status,
 * etc.) into one of 5 semantic tones, so a single badge component can
 * color-code every dashboard table consistently instead of every status
 * pill rendering the same flat color regardless of meaning.
 */
const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // success
  published: "success",
  active: "success",
  paid: "success",
  delivered: "success",
  won: "success",
  approved: "success",
  confirmed: "success",
  completed: "success",
  verified: "success",
  in_stock: "success",
  resolved: "success",
  shipped: "success",
  yes: "success",
  true: "success",
  done: "success",
  success: "success",
  // warning
  pending: "warning",
  processing: "warning",
  draft: "warning",
  low_stock: "warning",
  waitlisted: "warning",
  in_review: "warning",
  open: "warning",
  return_requested: "warning",
  soft_bans: "warning",
  // error
  failed: "error",
  cancelled: "error",
  canceled: "error",
  rejected: "error",
  banned: "error",
  hard_banned: "error",
  disabled: "error",
  refunded: "error",
  out_of_stock: "error",
  expired: "error",
  declined: "error",
  removed: "error",
  suspended: "error",
  no: "error",
  false: "error",
  // info
  scheduled: "info",
  closed: "info",
};

/** Map a raw status string to a semantic tone for badge coloring. */
export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return "neutral";
  const normalized = status
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/\(.*\)$/, "")
    .trim();
  return STATUS_TONE_MAP[normalized] ?? "neutral";
}

// --- Resource icon --------------------------------------------------------------

/**
 * One emoji per dashboard resource type, keyed by the 2nd segment of a
 * `ListingViewConfig.queryKey` (e.g. `["admin","users","listing"]` -> "users").
 * Used as the row-avatar fallback for tables/cards whose rows have no
 * per-row photo/thumbnail — gives every dashboard table a visual anchor
 * instead of plain text on a white/black background.
 */
const RESOURCE_ICON_MAP: Record<string, string> = {
  users: "👤",
  team: "🧑‍💼",
  stores: "🏪",
  products: "📦",
  art: "🎨",
  stickers: "🏷️",
  "live-items": "🔴",
  "digital-codes": "🔑",
  classified: "📋",
  "pre-orders": "🕓",
  "prize-draws": "🎁",
  auctions: "🔨",
  bundles: "🎀",
  bids: "🔨",
  orders: "🧾",
  payouts: "💰",
  "payout-methods": "💳",
  coupons: "🎟️",
  reviews: "⭐",
  blog: "📝",
  events: "🎉",
  "event-entries": "🎫",
  notifications: "🔔",
  carts: "🛒",
  wishlists: "💝",
  history: "🕐",
  categories: "🏷️",
  brands: "🏷️",
  faqs: "❓",
  carousel: "🖼️",
  addresses: "📍",
  "address-clusters": "📍",
  "store-addresses": "📍",
  sessions: "💻",
  scammers: "🚫",
  "support-tickets": "🎫",
  "return-requests": "↩️",
  contact: "✉️",
  newsletter: "📰",
  "grouped-listings": "🧷",
  shipments: "🚚",
  features: "🧩",
  "payment-methods": "💳",
  "shipping-configs": "🚚",
  "store-categories": "🏷️",
  "sublisting-categories": "🏷️",
  "tester-checklist-items": "✅",
  "tester-feedback": "💬",
  "catalogue-approvals": "📚",
  offers: "🤝",
};

/** Fallback icon for any resource not in the map. */
const RESOURCE_ICON_FALLBACK = "📄";

/** Resolve a resource-type icon from a `queryKey[1]`-style resource name. */
export function getResourceIcon(resourceKey: string | null | undefined): string {
  if (!resourceKey) return RESOURCE_ICON_FALLBACK;
  return RESOURCE_ICON_MAP[resourceKey] ?? RESOURCE_ICON_FALLBACK;
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
