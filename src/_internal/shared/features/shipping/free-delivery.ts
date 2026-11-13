/**
 * ── FREE DELIVERY: THREE CONFIG LEVELS, CSS-STYLE INHERITANCE ────────────────
 *
 * Owner, 2026-11-14: *"like CSS — inline listings; seller inherits to listing
 * if listing is not set, and seller inherits platform config if not set. All 3
 * are configs."*
 *
 *   listing.shipping.freeAbove          (inline — most specific)
 *     ?? store.shipping.freeAbove       (the seller's default)
 *       ?? siteSettings.shipping.minOrderForFree   (the platform default)
 *
 * 🛑 `??` AND NEVER `||`. A listing that sets `0` means "this always ships
 * free"; `||` treats that as absent and silently re-inherits the seller's
 * threshold — the exact precedence bug already recorded for payment methods,
 * where *"an explicit `false` falls through and the platform default silently
 * re-enables what a seller had turned off"*. Zero is a VALUE at every level.
 *
 * ## 🛑 WHY THE PLATFORM LEVEL IS A DEFAULT AND NOT A CEILING
 *
 * This project's config precedence has the platform contributing BOTH a hard
 * ceiling and a soft floor, and collapsing those is what makes a kill switch
 * overridable. Free delivery has no ceiling arm: a seller shipping their own
 * goods free is their money to spend, and the platform has no reason to forbid
 * it. So `minOrderForFree` is the fallback only — if a ceiling is ever wanted,
 * it must be a SECOND field, never this one reinterpreted.
 *
 * ⚠ And it finally gives `minOrderForFree` a reader. It was declared, typed and
 * defaulted with ZERO consumers — so "free shipping over ₹999" was stored on
 * both live databases and had never once been applied.
 */

/** Absent at every level means "never free" — the conservative direction. */
export const NEVER_FREE = Number.POSITIVE_INFINITY;

export interface FreeDeliveryLevels {
  /** `product.shipping.freeAbove` — inline. */
  listing?: number | undefined;
  /** `store.shipping.freeAbove` — the seller's default. */
  store?: number | undefined;
  /** `siteSettings.shipping.minOrderForFree` — the platform default. */
  platform?: number | undefined;
}

const usable = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/**
 * The threshold that applies to ONE listing, by inheritance.
 *
 * Returns `NEVER_FREE` when no level supplies a usable value.
 *
 * 🛑 `NEVER_FREE` rather than `0` or `undefined`. Zero would mean "free from
 * the first rupee" — i.e. an unconfigured install would ship EVERYTHING free,
 * which is precisely the state measured on this store (every parcel free
 * because nothing charged). `Infinity` makes "no configuration" mean "no free
 * delivery", so the comparison below needs no special-casing and cannot be
 * read the wrong way round.
 */
export function resolveFreeDeliveryThreshold(levels: FreeDeliveryLevels): number {
  if (usable(levels.listing)) return levels.listing;
  if (usable(levels.store)) return levels.store;
  if (usable(levels.platform)) return levels.platform;
  return NEVER_FREE;
}

/**
 * The threshold for a whole order GROUP — the strictest of its lines.
 *
 * 🛑 STRICTEST (HIGHEST) WINS, which is the convention already settled on this
 * project for per-listing config inside an order group: *"within a group every
 * listing is checked and the strictest wins, so one prepaid-only item makes its
 * group prepaid-only."* Shipping is billed per group and carriage cannot be
 * apportioned between lines, so the generous reading lets the cheapest
 * qualifying item carry an entire cart's delivery.
 *
 * ⚠ An EMPTY group answers `NEVER_FREE`, not "free". A vacuous truth on a money
 * path is how a degenerate input becomes free shipping — the same reasoning as
 * `groupIsFullyEntitled` on the prize waiver.
 */
export function resolveGroupFreeDeliveryThreshold(
  lines: readonly FreeDeliveryLevels[],
): number {
  if (lines.length === 0) return NEVER_FREE;
  return lines.reduce((strictest, l) => Math.max(strictest, resolveFreeDeliveryThreshold(l)), 0);
}

/**
 * Does this group's goods value clear its threshold?
 *
 * ⚠ `>=`, matching `quoteShipping`'s existing `goodsValue >= policy.freeAbove`,
 * so "free over ₹2000" includes ₹2000 exactly. One comparison, one meaning —
 * a second spelling of the same rule is what this file exists to avoid.
 */
export function qualifiesForFreeDelivery(goodsValue: number, threshold: number): boolean {
  if (!Number.isFinite(threshold)) return false;
  if (!Number.isFinite(goodsValue)) return false;
  return goodsValue >= threshold;
}
