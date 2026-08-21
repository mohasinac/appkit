/**
 * Listing-type tab constants (SB10-A).
 *
 * Single source of truth for the tab bars shown on category, brand, store,
 * admin, and search surfaces. Each entry maps to either a `listingType`
 * filter on the `products` collection or to a separate collection
 * (currently only `bundles`).
 *
 * DERIVED, NOT HAND-WRITTEN (2026-08-21). Every array below is built from
 * `ALL_LISTING_TYPES` + the listing-type plugin registry, so a new listing
 * type appears on every tab bar automatically. They used to be nine separate
 * hand-maintained literals and had drifted badly: `/products` offered only 4
 * of 9 types (missing auctions, pre-orders, prize draws, art, stickers — the
 * bug that started this sweep), the admin type chips used display LABELS as
 * Sieve filter ids, and several arrays still listed `bundle`, which stopped
 * being a listingType in SB-UNI-D. `scripts/audit-listing-type-tab-coverage.mjs`
 * blocks any regression.
 *
 * To add a tab that ISN'T a listing type (bundles, stores), append it to the
 * relevant array explicitly — those are genuinely different collections.
 */

import type { ListingType } from "../types";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";

export interface ListingTab {
  id: string;
  label: string;
  /** Filter against `products.listingType` when set. A `|`-joined value
   * (e.g. `"art|stickers"`) is a sievejs OR-group — used by the combined
   * Art & Stickers tab, which spans both listing types on one page. */
  listingType?: ListingType | string;
  /** Set when the tab queries a different collection (e.g. `bundles`). */
  collection?: "bundles";
  /** Set when the tab queries a non-product entity (e.g. `stores`). */
  entity?: "stores";
}

/**
 * The generic `/products` browse page spans EVERY listing type (2026-08-21).
 *
 * It used to span only `standard|classified|digital-code|live` on the theory
 * that auctions/pre-orders/prize-draws/art each had a dedicated page — but
 * that made five of nine types unreachable from the main catalogue, broke
 * seven legacy `/search/.../tab/<type>` permanent redirects that all point at
 * `/products`, and made the cross-type Compare + bulk-cart features (which
 * only exist on this page) unusable for those types. The dedicated pages
 * remain, and `/products` links to them when a single time-boxed type is
 * selected.
 */
export const GENERIC_PRODUCT_LISTING_TYPES: readonly ListingType[] = ALL_LISTING_TYPES;

/** The listing types the combined `/art` page spans. */
export const ART_STICKERS_LISTING_TYPES: readonly ListingType[] = ["art", "stickers"];

/**
 * A FILTER chip — `id` is the canonical `listingType`, because it is passed
 * straight into `sieveFilter("listingType", EQ, id)`. Never a display label.
 */
function chipTab(type: ListingType): ListingTab {
  return { id: type, label: pluginFor(type).chipLabel, listingType: type };
}

/**
 * A ROUTE-BACKED tab — `id` is the plugin's `tabSlug`, because it doubles as
 * the URL segment (`/stores/{slug}/pre-orders`) and is live in bookmarks.
 * The canonical type still rides along in `listingType` for the query.
 */
function pluralTab(type: ListingType): ListingTab {
  const plugin = pluginFor(type);
  return { id: plugin.tabSlug, label: plugin.pluralLabel, listingType: type };
}

/**
 * Art and stickers share the combined `/art` browse page, so category/brand/
 * store tab bars show them as ONE tab backed by a two-value OR-group. Derived
 * from both plugins rather than a hardcoded `"art|stickers"` string so the
 * pipe-group can't drift from the registry.
 */
const ART_STICKERS_COMBINED_TAB: ListingTab = {
  id: pluginFor("art").tabSlug,
  label: `${pluginFor("art").pluralLabel} & ${pluginFor("stickers").pluralLabel}`,
  listingType: ART_STICKERS_LISTING_TYPES.join("|"),
};

/** Listing types that get their own tab on a combined surface (art+stickers merge into one). */
const SEPARATELY_TABBED_TYPES = ALL_LISTING_TYPES.filter(
  (t) => t !== "art" && t !== "stickers",
);

/** Tabs shown on `/categories/[slug]` and `/brands/[slug]` detail pages. */
export const CATEGORY_PAGE_TABS: readonly ListingTab[] = [
  ...SEPARATELY_TABBED_TYPES.map(pluralTab),
  { id: "bundles", label: "Bundles", collection: "bundles" },
  ART_STICKERS_COMBINED_TAB,
  { id: "stores", label: "Stores", entity: "stores" },
];

export type CategoryTabId = string;

/** Tabs shown on the public `/stores/[slug]` nav bar. */
export const STORE_PAGE_TABS: readonly ListingTab[] = [
  ...SEPARATELY_TABBED_TYPES.map(pluralTab),
  { id: "bundles", label: "Bundles", collection: "bundles" },
  ART_STICKERS_COMBINED_TAB,
];

export type StoreTabId = string;

/** Tabs shown on the seller-dashboard listings view + admin products list. */
export const SELLER_LISTING_TABS: readonly ListingTab[] = [
  { id: "all", label: "All" },
  ...ALL_LISTING_TYPES.map(pluralTab),
];

export type SellerListingTabId = string;

/**
 * In-page type-filter chips on the generic `/products` browse page.
 *
 * Multi-select (checkbox semantics) — no "All" sentinel chip, because "none
 * checked" already means "every type". A sentinel would be a second way to
 * express the same state and would have to be cleared whenever a real chip
 * was ticked.
 */
export const PRODUCT_TYPE_FILTER_TABS: readonly ListingTab[] =
  ALL_LISTING_TYPES.map(chipTab);

/** In-page type-filter chips on the combined `/art` (Art & Stickers) page. */
export const ART_STICKERS_TYPE_FILTER_TABS: readonly ListingTab[] =
  ART_STICKERS_LISTING_TYPES.map(chipTab);
