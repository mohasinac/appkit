/**
 * Listing-type capability registry — Pattern 1 + 2 from the SB-UNI plan.
 *
 * Every consumer that needs to branch on listing type reads from this
 * registry rather than writing `if (listingType === "X")`. Adding a new
 * listing type later means adding one row here + one folder under
 * `_internal/shared/listing-types/<type>/` — no scattered grep needed.
 *
 * Capabilities are intentionally minimal — only behavioral facts that
 * cross feature boundaries. Per-type rendering / form layout / SEO live
 * inside the per-type folder (X2 plugin layout).
 */

import type { ListingType } from "../../../features/products/types/index";

export interface ListingTypeCapability {
  /** Buyers can add this listing to a cart and check out. */
  canAddToCart: boolean;
  /** Listing accepts bid placements. */
  canBid: boolean;
  /** Listing has physical fulfillment (drives shipping address requirement). */
  supportsShipping: boolean;
  /** Seller must be a verified vendor for KYC-gated listings. */
  requiresVendorVerified: boolean;
  /** Checkout must validate buyer jurisdiction (regulated items). */
  requiresJurisdictionCheck: boolean;
  /** Listing fulfills immediately on purchase (no shipping label flow). */
  hasInstantFulfillment: boolean;
}

export const LISTING_TYPE_CAPABILITIES: Record<ListingType, ListingTypeCapability> = {
  standard: {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
  },
  auction: {
    canAddToCart: false,
    canBid: true,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
  },
  "pre-order": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
  },
  "prize-draw": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
  },
  // SB-UNI-D will drop the "bundle" row from this map; bundles become a
  // category-level concept. Until then, the row matches the cart-line
  // semantics that ship today.
  bundle: {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
  },
};

export function capabilityFor(type: ListingType): ListingTypeCapability {
  return LISTING_TYPE_CAPABILITIES[type];
}

export function canAddToCart(type: ListingType): boolean {
  return LISTING_TYPE_CAPABILITIES[type].canAddToCart;
}

export function canBid(type: ListingType): boolean {
  return LISTING_TYPE_CAPABILITIES[type].canBid;
}

export function supportsShipping(type: ListingType): boolean {
  return LISTING_TYPE_CAPABILITIES[type].supportsShipping;
}

export function requiresVendorVerified(type: ListingType): boolean {
  return LISTING_TYPE_CAPABILITIES[type].requiresVendorVerified;
}

export function requiresJurisdictionCheck(type: ListingType): boolean {
  return LISTING_TYPE_CAPABILITIES[type].requiresJurisdictionCheck;
}

export function hasInstantFulfillment(type: ListingType): boolean {
  return LISTING_TYPE_CAPABILITIES[type].hasInstantFulfillment;
}

/**
 * Exhaustive-switch helper. Use in `switch (type) { case ...: default: assertNever(type); }`
 * so adding a new `ListingType` member is a TS error at every consumer
 * that didn't update.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant: ${String(value)}`);
}
