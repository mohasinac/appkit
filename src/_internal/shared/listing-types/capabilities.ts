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
  /**
   * Buyers can negotiate the price via the Make-an-Offer flow.
   *
   * A per-listing `allowOffers` flag is normally required on top of this — the
   * capability says the TYPE can support offers at all, the flag says this
   * particular seller opted in. `offersEnabledFor()` checks both.
   *
   * 🛑 One exception, and it is structural: on a type with `canAddToCart: false`
   * the offer is the only way to buy, so `allowOffers` cannot decide whether an
   * offer may be sent — it decides whether the buyer may propose a price BELOW
   * the asking one. Otherwise unchecking one flag would render a price with no
   * path to it.
   *
   * False wherever a negotiated price would collide with the type's own pricing
   * mechanism: an auction already has bidding, a prize-draw sells fixed-price
   * entries, a digital code is a fungible pool item, a pre-order is a deposit
   * against a future price, and a live item is jurisdiction-gated with a
   * verified vendor on the hook for it.
   */
  canMakeOffer: boolean;
}

export const LISTING_TYPE_CAPABILITIES: Record<ListingType, ListingTypeCapability> = {
  standard: {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: true,   // the ordinary negotiable listing
  },
  auction: {
    canAddToCart: false,
    canBid: true,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // bidding IS the price mechanism
  },
  "pre-order": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // deposit against a future price, not a price to haggle
  },
  "prize-draw": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // fixed-price entries; a discounted entry breaks the draw's economics
  },
  // SB-UNI-F 2026-05-13 — Phase 2 union extension.
  classified: {
    // No cart (OLX / Facebook Marketplace pattern). Paired with
    // `canMakeOffer: true` this is the ONLY combination in the table where the
    // offer is the purchase path rather than an alternative to one — which is
    // what `offerIsOnlyPurchasePath()` detects, and why `allowOffers` cannot
    // gate whether an offer may be sent on this type at all.
    canAddToCart: false,
    canBid: false,
    supportsShipping: false,    // local meetup; shipping is a "negotiable" flag, not a flow
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: true,   // haggling is the norm here — see the `negotiable` flag
  },
  "digital-code": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: false,    // codes delivered electronically — no address
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: true, // atomic code claim at order paid
    canMakeOffer: false,  // fungible pool item, priced per code
  },
  live: {
    canAddToCart: true,         // but jurisdictionAllowed must include buyer's state
    canBid: false,
    supportsShipping: true,     // physical, often via specialised carrier
    requiresVendorVerified: true,
    requiresJurisdictionCheck: true,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // jurisdiction-gated with a verified vendor accountable for the price
  },
  // Art/stickers session — printed-only physical goods, standard-like checkout.
  art: {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: true,   // printed goods, standard-like
  },
  stickers: {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: true,   // printed goods, standard-like
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

export function canMakeOffer(type: ListingType): boolean {
  return LISTING_TYPE_CAPABILITIES[type].canMakeOffer;
}

/**
 * Exhaustive-switch helper. Use in `switch (type) { case ...: default: assertNever(type); }`
 * so adding a new `ListingType` member is a TS error at every consumer
 * that didn't update.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant: ${String(value)}`);
}
