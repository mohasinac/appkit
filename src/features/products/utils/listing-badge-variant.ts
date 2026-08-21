import type { ListingType } from "../types/index";
import { isListingType } from "./listing-type";

export type ListingBadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

/**
 * Listing-kind → Badge variant map.
 *
 * Centralised so admin / seller / consumer surfaces all derive the same
 * visual variant from a product's `listingKind` value. Replaces the
 * deprecated `KIND_BADGE_VARIANT` export that previously lived in
 * `seller-products-styles.ts` (deleted 2026-06-17 in Phase 3 of the
 * Three-Layer Style System refactor).
 *
 * Typed `Record<ListingType, …>` (2026-08-21) so a new listing type is a
 * COMPILE error here rather than a silent fallthrough. It previously covered
 * only auction / pre-order / prize-draw / standard, so the other five types
 * fell through to the caller's `?? "default"` and all rendered identically.
 */
export const LISTING_BADGE_VARIANT: Record<ListingType, ListingBadgeVariant> = {
  standard: "default",
  auction: "warning",
  "pre-order": "secondary",
  "prize-draw": "primary",
  classified: "secondary",
  "digital-code": "success",
  live: "danger",
  art: "primary",
  stickers: "primary",
};

/**
 * Badge variant for a listing kind that may not be a real `ListingType` —
 * a raw API string, or a UI-only sentinel like the seller dropdown's `"all"`.
 *
 * Callers used to index `LISTING_BADGE_VARIANT[kind] ?? "default"` directly
 * with a plain `string`, which is what let the map stay incomplete for years
 * without anyone noticing: the `??` swallowed every missing type. Going
 * through this accessor keeps the map itself exhaustively typed (so a new
 * listing type is a compile error there) while still tolerating a
 * non-ListingType input here, where tolerance is genuinely needed.
 */
export function listingBadgeVariant(kind: string | undefined): ListingBadgeVariant {
  return kind && isListingType(kind) ? LISTING_BADGE_VARIANT[kind] : "default";
}
