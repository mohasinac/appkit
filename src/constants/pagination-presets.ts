/**
 * Pagination presets — W2-5
 *
 * Canonical page-size and limit constants. Reference these instead of
 * redefining `PAGE_SIZE` / `DEFAULT_PAGE_SIZE` / `FEATURED_LIMIT` per feature.
 *
 * Empirically derived from the existing distribution (2026-05-23):
 *   - public marketplace cards (24 per page) — GRID
 *   - admin tables               (50 per page) — LARGE
 *   - admin tables (default 25)                — DEFAULT
 *   - bundle/category page nav   (12 per page) — SMALL
 */

export const PAGE_SIZES = {
  SMALL: 12,
  DEFAULT: 25,
  GRID: 24,
  LARGE: 50,
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES;

/** Maximum permissible page-size for paginated API routes. Server-side guard. */
export const MAX_PAGE_SIZE = 100;

/** Per-resource featured-section limits (homepage hero strips). */
export const FEATURED_LIMITS = {
  products: 8,
  categories: 12,
  stores: 8,
  blog: 3,
  bundles: 12,
  events: 6,
  auctions: 8,
} as const;

/** Per-resource sitemap node-count limits (URL caps). */
export const SITEMAP_LIMITS = {
  products: 5000,
  categories: 200,
  stores: 200,
  blog: 5000,
  auctions: 5000,
} as const;
