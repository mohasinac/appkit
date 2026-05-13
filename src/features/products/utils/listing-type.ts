import type { ListingType } from "../types/index";

/**
 * Canonical accessor for the listing-kind discriminator. `listingType` is the
 * single source of truth on every `ProductDocument` / `ProductItem` — the
 * legacy `isAuction` / `isPreOrder` booleans were removed in S3 (SB1-G final,
 * 2026-05-13).
 *
 * Returns `"standard"` when the input is undefined or missing the field, so
 * legacy payloads still classify safely without a separate guard.
 */
export function normalizeListingType(
  input?: { listingType?: ListingType },
): ListingType {
  return input?.listingType ?? "standard";
}

/** Convenience predicates that read the canonical `listingType` discriminator. */
export const isAuctionListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "auction";

export const isPreOrderListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "pre-order";

export const isStandardListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "standard";

export const isPrizeDrawListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "prize-draw";

// SB-UNI-D — isBundleListing removed. Bundles are now a categoryType
// discriminator on CategoryDocument; consumers should query
// `categoriesRepository.findBySlugAndType(slug, "bundle")` instead.
