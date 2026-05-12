import type { ListingType } from "../types/index";

/**
 * Canonical accessor for the listing-kind discriminator. SB1-G Phase 4
 * (S22 2026-05-12) made `listingType` the single source of truth on every
 * `ProductDocument` / `ProductItem` — the legacy `isAuction` / `isPreOrder`
 * booleans were removed in the same session.
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
