/**
 * Listing-type tab constants (SB10-A).
 *
 * Single source of truth for the tab bars shown on category, brand, store,
 * admin, and search surfaces. Each entry maps to either a `listingType`
 * filter on the `products` collection or to a separate collection
 * (currently only `bundles`).
 *
 * Add new tab variants here — never inline the tab list inside the view.
 */

import type { ListingType } from "../types";

export interface ListingTab {
  id: string;
  label: string;
  /** Filter against `products.listingType` when set. */
  listingType?: ListingType;
  /** Set when the tab queries a different collection (e.g. `bundles`). */
  collection?: "bundles";
}

/** Tabs shown on `/categories/[slug]` and `/brands/[slug]` detail pages. */
export const CATEGORY_PAGE_TABS = [
  { id: "products", label: "Products", listingType: "standard" },
  { id: "auctions", label: "Auctions", listingType: "auction" },
  { id: "pre-orders", label: "Pre-Orders", listingType: "pre-order" },
  { id: "prize-draws", label: "Prize Draws", listingType: "prize-draw" },
  { id: "bundles", label: "Bundles", collection: "bundles" },
] as const satisfies readonly ListingTab[];

export type CategoryTabId = (typeof CATEGORY_PAGE_TABS)[number]["id"];

/** Tabs shown on the public `/stores/[slug]` nav bar. */
export const STORE_PAGE_TABS = [
  { id: "products", label: "Products", listingType: "standard" },
  { id: "auctions", label: "Auctions", listingType: "auction" },
  { id: "pre-orders", label: "Pre-Orders", listingType: "pre-order" },
  { id: "prize-draws", label: "Prize Draws", listingType: "prize-draw" },
  { id: "bundles", label: "Bundles", collection: "bundles" },
] as const satisfies readonly ListingTab[];

export type StoreTabId = (typeof STORE_PAGE_TABS)[number]["id"];

/** Tabs shown on the seller-dashboard listings view + admin products list. */
export const SELLER_LISTING_TABS = [
  { id: "all", label: "All" },
  { id: "products", label: "Products", listingType: "standard" },
  { id: "auctions", label: "Auctions", listingType: "auction" },
  { id: "pre-orders", label: "Pre-Orders", listingType: "pre-order" },
  { id: "prize-draws", label: "Prize Draws", listingType: "prize-draw" },
] as const;

export type SellerListingTabId = (typeof SELLER_LISTING_TABS)[number]["id"];

/** Tabs shown on `/search` results. */
export const SEARCH_RESULT_TABS = [
  { id: "all", label: "All" },
  { id: "products", label: "Products", listingType: "standard" },
  { id: "auctions", label: "Auctions", listingType: "auction" },
  { id: "pre-orders", label: "Pre-Orders", listingType: "pre-order" },
  { id: "prize-draws", label: "Prize Draws", listingType: "prize-draw" },
  { id: "bundles", label: "Bundles", collection: "bundles" },
] as const;

export type SearchTabId = (typeof SEARCH_RESULT_TABS)[number]["id"];
