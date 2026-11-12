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
   * mechanism: a collector drop already has bidding, clearance sells fixed-price
   * entries, a digital code is a fungible pool item, a pre-order is a deposit
   * against a future price, and a live item is jurisdiction-gated with a
   * verified vendor on the hook for it.
   */
  canMakeOffer: boolean;

  /**
   * Loyalty coins may be spent against this listing type.
   *
   * 🛑 A CAPABILITY, not a hardcoded listing-type check — this is the whole
   * point. The owner's decision (2026-11-07) was "coins work on clearance by
   * default, but if in future we allow another type we must not have to write
   * code for it". So enabling coins on any type, including one that does not
   * exist yet, is a change to this table plus a `siteSettings` flag; never an
   * `if (listingType === ...)` anywhere else.
   *
   * Economics live in config, not here: earn rate (1 coin per ₹1), redemption
   * ratio (10 coins = ₹1) and any per-order cap are tunable without a deploy.
   * This flag answers only "is this type eligible at all".
   */
  acceptsPointsTender: boolean;

  /**
   * The seller may mark listings of this type as a concealed/"surprise" item,
   * whose contents are revealed to the buyer as a distinct, auditable step.
   *
   * Gates the reveal mechanic AND its refund consequences: cancellation is
   * permitted only while an order is both unconfirmed and unrevealed, and the
   * allocation is generated server-side and immutable so a seller cannot
   * substitute after the fact.
   *
   * Capability-level only. A seller still opts a given product in — the same
   * two-level model as `canMakeOffer` + `allowOffers`.
   */
  supportsSurpriseReveal: boolean;

  /**
   * Fulfilment of this type MAY be deferred to an explicit human release
   * instead of completing automatically when the order is paid.
   *
   * 🛑 A CAPABILITY, not a type check, and it is the second level of the
   * `hasInstantFulfillment` pair rather than its opposite:
   *
   *   `hasInstantFulfillment`      — this type CAN complete without a human
   *   `supportsDeferredFulfilment` — and it can also WAIT for one
   *
   * Both true for `digital-code`, because the owner's decision is that
   * fulfilment is **seller-configurable** per listing: a code can auto-issue
   * on payment or sit until a person releases it. The per-listing opt-in is
   * `digitalCode.codeDeliveryMethod` (`"auto-claim" | "manual-email"`), the
   * same two-level model as `canMakeOffer` + `allowOffers`. Resolve the two
   * together with `fulfilmentModeFor()` in the order workflow registry —
   * never by comparing a listing type to a string.
   *
   * False everywhere else today, and that is a statement about the MECHANISM
   * being absent rather than about those types: a shipped type's "release" is
   * the shipment, which the order lifecycle already models. Turning this on
   * for another type is a row edit here plus a per-listing flag that type can
   * carry — no code change.
   */
  supportsDeferredFulfilment: boolean;
}

export const LISTING_TYPE_CAPABILITIES: Record<ListingType, ListingTypeCapability> = {
  /*
   * Standard physical-goods behaviour, with ONE deliberate difference:
   * `canMakeOffer` is true.
   *
   * A loose part has no catalogue price — what a spare attack ring is worth
   * depends on the colour, the wear and how badly the buyer needs that exact
   * one. It is the archetypal haggled item here, which is the whole reason the
   * seller is listing it instead of leaving it in a drawer, so the type that
   * most needs Make-an-Offer is this one.
   */
  spares: {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: true,
    acceptsPointsTender: false,
    supportsSurpriseReveal: false,
    supportsDeferredFulfilment: false,
  },
  standard: {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: true,   // the ordinary negotiable listing
    acceptsPointsTender: false,  // flip to true the day the owner widens coins
    supportsSurpriseReveal: false,
    supportsDeferredFulfilment: false,
  },
  "collector-drop": {
    canAddToCart: false,
    canBid: true,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // bidding IS the price mechanism
    acceptsPointsTender: false,
    supportsSurpriseReveal: false,
    supportsDeferredFulfilment: false,
  },
  "pre-order": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // deposit against a future price, not a price to haggle
    acceptsPointsTender: false,
    supportsSurpriseReveal: false,
    supportsDeferredFulfilment: false,
  },
  "clearance": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // fixed-price entries; a discounted entry breaks the draw's economics
    // The two capabilities clearance actually carries today (owner, 2026-11-07).
    // Coins are scoped here first; surprise/reveal is the mechanic clearance
    // exists for. Both are capability flags precisely so widening them later is
    // a table edit, not a code change.
    acceptsPointsTender: true,
    supportsSurpriseReveal: true,
    supportsDeferredFulfilment: false,
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
    acceptsPointsTender: false,
    supportsSurpriseReveal: false,
    supportsDeferredFulfilment: false,
  },
  "digital-code": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: false,    // codes delivered electronically — no address
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: true, // atomic code claim at order paid
    canMakeOffer: false,  // fungible pool item, priced per code
    acceptsPointsTender: false,
    supportsSurpriseReveal: false,
    // Both halves true: a code can auto-issue on payment OR wait for a
    // seller to release it. `codeDeliveryMethod` on the listing decides
    // which, so this is the only type that currently needs the pair.
    supportsDeferredFulfilment: true,
  },
  live: {
    canAddToCart: true,         // but jurisdictionAllowed must include buyer's state
    canBid: false,
    supportsShipping: true,     // physical, often via specialised carrier
    requiresVendorVerified: true,
    requiresJurisdictionCheck: true,
    hasInstantFulfillment: false,
    canMakeOffer: false,  // jurisdiction-gated with a verified vendor accountable for the price
    acceptsPointsTender: false,
    supportsSurpriseReveal: false,
    supportsDeferredFulfilment: false,
  },
  /*
   * Printed-only physical goods — prints, sheets and cut-out stickers.
   *
   * 🛑 ONE row, not two. `art` and `stickers` were separate union members
   * with byte-identical rows here; the merge (1.34) collapsed them.
   */
  "art-and-stickers": {
    canAddToCart: true,
    canBid: false,
    supportsShipping: true,
    requiresVendorVerified: false,
    requiresJurisdictionCheck: false,
    hasInstantFulfillment: false,
    canMakeOffer: true,   // printed goods, standard-like
    acceptsPointsTender: false,
    supportsSurpriseReveal: false,
    supportsDeferredFulfilment: false,
  },
};

/**
 * What an UNKNOWN listing type can do: as little as possible.
 *
 * ## 🛑 Why this exists
 *
 * `capabilityFor` used to be a bare index into the map. `ListingType` is a
 * closed union, so the compiler believed that was total — but the argument
 * arrives from a STORED Firestore value, and a stored slug this build has
 * never seen (an older deploy reading newer config, a hand-edited document, a
 * type added by config) indexes to `undefined`. The next property read then
 * throws:
 *
 *     getCap(item).supportsShipping   // TypeError: undefined is not an object
 *
 * So the governing rule of this architecture — *unknown values DEGRADE, never
 * throw* — was broken in the registry the architecture is named after, and the
 * trigger is exactly what storing listing types as config does.
 *
 * ## 🛑 Why these particular values, and not `standard`'s
 *
 * Falling back to `standard` would be the dangerous kind of convenient: an
 * unrecognised listing becomes freely purchasable, offerable and
 * points-payable on the strength of a typo.
 *
 * Each field degrades to the side that REFUSES, except the two where `false`
 * is itself the dangerous answer:
 *
 * - `supportsShipping: true` — a physical good misread as digital ships
 *   nowhere and the buyer never gets an address form. Demanding an address we
 *   might not need is recoverable; silently skipping fulfilment is not.
 * - `requiresVendorVerified` / `requiresJurisdictionCheck: true` — these are
 *   `requires*` gates, so `false` would SKIP a KYC or a regulated-goods check.
 *   An unknown type is exactly when you want them on.
 *
 * Mirrors `UNKNOWN_METHOD_CAPABILITIES` in the payments registry, which
 * already made this call correctly for payment methods.
 */
export const UNKNOWN_LISTING_TYPE_CAPABILITY: ListingTypeCapability = {
  canAddToCart: false,
  canBid: false,
  supportsShipping: true,
  requiresVendorVerified: true,
  requiresJurisdictionCheck: true,
  hasInstantFulfillment: false,
  canMakeOffer: false,
  acceptsPointsTender: false,
  supportsSurpriseReveal: false,
  supportsDeferredFulfilment: false,
};

export function capabilityFor(type: ListingType): ListingTypeCapability {
  // `?? UNKNOWN` and not a bare index: see above. The cast is deliberate —
  // callers pass stored values, so the union is a claim, not a guarantee.
  return (
    LISTING_TYPE_CAPABILITIES[type] ??
    UNKNOWN_LISTING_TYPE_CAPABILITY
  );
}

export function canAddToCart(type: ListingType): boolean {
  return capabilityFor(type).canAddToCart;
}

export function canBid(type: ListingType): boolean {
  return capabilityFor(type).canBid;
}

export function supportsShipping(type: ListingType): boolean {
  return capabilityFor(type).supportsShipping;
}

export function requiresVendorVerified(type: ListingType): boolean {
  return capabilityFor(type).requiresVendorVerified;
}

export function requiresJurisdictionCheck(type: ListingType): boolean {
  return capabilityFor(type).requiresJurisdictionCheck;
}

export function hasInstantFulfillment(type: ListingType): boolean {
  return capabilityFor(type).hasInstantFulfillment;
}

export function canMakeOffer(type: ListingType): boolean {
  return capabilityFor(type).canMakeOffer;
}

/**
 * Whether loyalty coins may be tendered against this listing type.
 *
 * Call this instead of writing `listingType === "clearance"` at a cart or
 * checkout site. Widening coins to another type then means editing one row in
 * the table above — which is the entire point of the capability model.
 */
export function acceptsPointsTender(type: ListingType): boolean {
  return capabilityFor(type).acceptsPointsTender;
}

/**
 * Whether sellers may mark listings of this type as concealed/"surprise".
 *
 * Capability only. A given product still opts in, and the order-level reveal
 * state is what actually gates cancellation and refunds.
 */
export function supportsSurpriseReveal(type: ListingType): boolean {
  return capabilityFor(type).supportsSurpriseReveal;
}

/**
 * Whether fulfilment of this type may be deferred to a human release.
 *
 * Capability only — the per-listing `codeDeliveryMethod` says whether this
 * seller actually chose to defer. `fulfilmentModeFor()` in the order workflow
 * registry resolves both; call that, not this, at a fulfilment site.
 */
export function supportsDeferredFulfilment(type: ListingType): boolean {
  return capabilityFor(type).supportsDeferredFulfilment;
}

/**
 * Exhaustive-switch helper. Use in `switch (type) { case ...: default: assertNever(type); }`
 * so adding a new `ListingType` member is a TS error at every consumer
 * that didn't update.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant: ${String(value)}`);
}
