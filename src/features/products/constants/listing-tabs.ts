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
 * The types the generic `/products` browse page spans — the GENERAL CATALOGUE,
 * not an index of everything.
 *
 * DERIVED from `ListingTypePlugin.inGeneralCatalogue`, never hand-written: a
 * literal array here is how ten enumerations of one union drifted apart in
 * Root Cause #61, and `audit-listing-type-tab-coverage`'s STAYS_DERIVED rule
 * blocks one.
 *
 * ## History — this spanned all nine types from 2026-08-21 until now
 *
 * The widening was a fix for Root Cause #61 and cited three reasons. Two have
 * since been solved elsewhere, and the third is an accepted cost:
 *
 *  1. "Five of nine types unreachable from the main catalogue." Still true for
 *     `classified`/`digital-code`/`live`, which have dedicated pages but no
 *     `MAIN_NAV_ITEMS` entry — which is exactly why `inGeneralCatalogue` keeps
 *     those three here. The other five are all in the main nav.
 *  2. "Seven legacy `/search/.../tab/<type>` redirects all point at /products."
 *     No longer true: that route derives `tabSlug -> browseRoute` from this
 *     same registry, and `/search` maps every resource type to its own page.
 *     Neither falls through to `/products` for a typed request.
 *  3. "Cross-type Compare + bulk-cart only exist on this page." Still true, and
 *     accepted: you can no longer compare an auction against a standard product.
 *
 * A type appearing both here and in the main nav is the bug this fixes — the
 * same item reachable from two places with two different chromes (an auction
 * card in the general grid renders Buy-Now chrome, not bid affordances).
 */
export const GENERIC_PRODUCT_LISTING_TYPES: readonly ListingType[] =
  ALL_LISTING_TYPES.filter((t) => pluginFor(t).inGeneralCatalogue);

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
 * checked" already means "every type IN THE GENERAL CATALOGUE". A sentinel
 * would be a second way to express the same state and would have to be cleared
 * whenever a real chip was ticked.
 *
 * 🛑 Derived from `GENERIC_PRODUCT_LISTING_TYPES`, NOT `ALL_LISTING_TYPES`. The
 * chips must offer exactly the types the page can actually return: a chip for a
 * type outside the span intersects to empty, and `listPublicProducts` then falls
 * back to the full span — i.e. ticking it would silently widen the results
 * instead of narrowing them. `ADMIN_PRODUCT_LISTING_TYPE_TABS` is a separate
 * constant and correctly stays all-nine.
 */
export const PRODUCT_TYPE_FILTER_TABS: readonly ListingTab[] =
  GENERIC_PRODUCT_LISTING_TYPES.map(chipTab);

/** In-page type-filter chips on the combined `/art` (Art & Stickers) page. */
export const ART_STICKERS_TYPE_FILTER_TABS: readonly ListingTab[] =
  ART_STICKERS_LISTING_TYPES.map(chipTab);
