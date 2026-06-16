/**
 * Listing-kind → Badge variant map.
 *
 * Centralised so admin / seller / consumer surfaces all derive the same
 * visual variant from a product's `listingKind` value. Replaces the
 * deprecated `KIND_BADGE_VARIANT` export that previously lived in
 * `seller-products-styles.ts` (deleted 2026-06-17 in Phase 3 of the
 * Three-Layer Style System refactor).
 */
export const LISTING_BADGE_VARIANT: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
  auction: "warning",
  "pre-order": "secondary",
  "prize-draw": "primary",
  standard: "default",
};
