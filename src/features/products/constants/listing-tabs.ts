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

/**
 * The consolidated generic `/products` browse tab covers these 4 listing
 * types (auctions/pre-orders/bundles/prize-draws/art+stickers each have
 * their own dedicated public page). Shared between the server-rendered
 * page view and the client listing component so they can't drift apart.
 */
export const GENERIC_PRODUCT_LISTING_TYPES = ["standard", "classified", "digital-code", "live"] as const;

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

/** Tabs shown on `/categories/[slug]` and `/brands/[slug]` detail pages. */
export const CATEGORY_PAGE_TABS = [
  { id: "products", label: "Products", listingType: "standard" },
  { id: "auctions", label: "Auctions", listingType: "auction" },
  { id: "pre-orders", label: "Pre-Orders", listingType: "pre-order" },
  { id: "prize-draws", label: "Prize Draws", listingType: "prize-draw" },
  { id: "bundles", label: "Bundles", collection: "bundles" },
  { id: "classifieds", label: "Classifieds", listingType: "classified" },
  { id: "digital-codes", label: "Digital Codes", listingType: "digital-code" },
  { id: "live", label: "Live Items", listingType: "live" },
  // Combined — one public browse page (`/art`) spans both listing types.
  { id: "art", label: "Art & Stickers", listingType: "art|stickers" },
  { id: "stores", label: "Stores", entity: "stores" },
] as const satisfies readonly ListingTab[];

export type CategoryTabId = (typeof CATEGORY_PAGE_TABS)[number]["id"];

/** Tabs shown on the public `/stores/[slug]` nav bar. */
export const STORE_PAGE_TABS = [
  { id: "products", label: "Products", listingType: "standard" },
  { id: "auctions", label: "Auctions", listingType: "auction" },
  { id: "pre-orders", label: "Pre-Orders", listingType: "pre-order" },
  { id: "prize-draws", label: "Prize Draws", listingType: "prize-draw" },
  { id: "bundles", label: "Bundles", collection: "bundles" },
  { id: "classifieds", label: "Classifieds", listingType: "classified" },
  { id: "digital-codes", label: "Digital Codes", listingType: "digital-code" },
  { id: "live", label: "Live Items", listingType: "live" },
  { id: "art", label: "Art & Stickers", listingType: "art|stickers" },
] as const satisfies readonly ListingTab[];

export type StoreTabId = (typeof STORE_PAGE_TABS)[number]["id"];

/** Tabs shown on the seller-dashboard listings view + admin products list. */
export const SELLER_LISTING_TABS = [
  { id: "all", label: "All" },
  { id: "products", label: "Products", listingType: "standard" },
  { id: "auctions", label: "Auctions", listingType: "auction" },
  { id: "pre-orders", label: "Pre-Orders", listingType: "pre-order" },
  { id: "prize-draws", label: "Prize Draws", listingType: "prize-draw" },
  { id: "classifieds", label: "Classifieds", listingType: "classified" },
  { id: "digital-codes", label: "Digital Codes", listingType: "digital-code" },
  { id: "live", label: "Live Items", listingType: "live" },
  { id: "art", label: "Art", listingType: "art" },
  { id: "stickers", label: "Stickers", listingType: "stickers" },
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
  { id: "classifieds", label: "Classifieds", listingType: "classified" },
  { id: "digital-codes", label: "Digital Codes", listingType: "digital-code" },
  { id: "live", label: "Live Items", listingType: "live" },
  { id: "art", label: "Art & Stickers", listingType: "art|stickers" },
] as const;

export type SearchTabId = (typeof SEARCH_RESULT_TABS)[number]["id"];

/** In-page type-filter chips on the generic `/products` browse page. */
export const PRODUCT_TYPE_FILTER_TABS = [
  { id: "All", label: "All" },
  { id: "standard", label: "Standard" },
  { id: "classified", label: "Classified" },
  { id: "digital-code", label: "Digital Codes" },
  { id: "live", label: "Live Items" },
] as const;

/** In-page type-filter chips on the combined `/art` (Art & Stickers) page. */
export const ART_STICKERS_TYPE_FILTER_TABS = [
  { id: "All", label: "All" },
  { id: "art", label: "Art" },
  { id: "stickers", label: "Stickers" },
] as const;
