import type { ListingType, ProductItem } from "../types/index";

/**
 * Canonical accessor for the listing-kind discriminator. SB1-G (S21 2026-05-12)
 * made `listingType` the single source of truth on every product doc; the
 * legacy `isAuction` / `isPreOrder` boolean fallbacks remain in this signature
 * only until Lane B finishes migrating `_internal/server/features/{products,
 * auctions,pre-orders}` to read `listingType` directly. Once that lands, the
 * Pick<> below can be tightened to `"listingType"` only.
 */
export function normalizeListingType(
  input?: Partial<
    Pick<ProductItem, "listingType" | "isAuction" | "isPreOrder">
  >,
): ListingType {
  if (input?.listingType) return input.listingType;
  if (input?.isAuction) return "auction";
  if (input?.isPreOrder) return "pre-order";
  return "standard";
}

/** Convenience predicates that read the canonical `listingType` discriminator. */
export const isAuctionListing = (
  input?: Partial<Pick<ProductItem, "listingType" | "isAuction" | "isPreOrder">>,
): boolean => normalizeListingType(input) === "auction";

export const isPreOrderListing = (
  input?: Partial<Pick<ProductItem, "listingType" | "isAuction" | "isPreOrder">>,
): boolean => normalizeListingType(input) === "pre-order";

export const isStandardListing = (
  input?: Partial<Pick<ProductItem, "listingType" | "isAuction" | "isPreOrder">>,
): boolean => normalizeListingType(input) === "standard";
