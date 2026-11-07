/**
 * The MECHANISM CATALOGUE — every behaviour the platform can switch on.
 *
 * ## The rule this file exists to enforce (owner, 2026-11-08)
 *
 * *"Since listing types is also a mechanism and all the rules we have on them
 * right now are just generic ones, there is no distinction between a normal
 * listing type to another — it's the mechanisms on them that differs."*
 *
 * So: **the code says every mechanism works on every listing.** Nothing in
 * `features/` may ask "is this a clearance listing?" — it asks "does this
 * listing have the `reveal` mechanism?", and the answer comes from the type's
 * row in `listing-types-seed-data.ts`.
 *
 * This file is the catalogue of *what can be asked*. It carries no per-type
 * values at all, deliberately: the moment a default here is type-aware, the
 * branching has moved rather than disappeared.
 *
 * ## Why a catalogue and not just booleans on the type
 *
 * Three things need the list of mechanisms independently of any type:
 *
 * 1. the **type editor** renders one toggle per row here (12-admin-settings);
 * 2. **search** matches on mechanism as a dimension (05-listing-pages);
 * 3. **blocking** disables a mechanism globally, which must deactivate every
 *    widget bound to it regardless of which types had it on (01-widgets).
 *
 * ## 🛑 Relationship to `_internal/shared/listing-types/capabilities.ts`
 *
 * That registry is today's in-code version of the same idea, and it is the
 * right shape — but it is CODE, so adding a type still means editing a file.
 * The migration is: capabilities.ts becomes a reader of this seed rather than
 * a second copy of it. **Until that lands these two must not drift** — if you
 * add a mechanism here, add it there in the same commit.
 *
 * Mocks: `mocks/01-widgets.qm` page *Mechanisms as config*,
 *        `mocks/12-admin-settings.qm` page *Listing type editor*.
 */

/** What kind of question the mechanism answers — used to group the editor UI. */
export type MechanismGroup =
  | "commerce"
  | "pricing"
  | "fulfilment"
  | "trust"
  | "loyalty"
  | "content";

export interface MechanismDefinition {
  /** Stable key. NEVER renamed — the label is content, the key is an address. */
  id: string;
  /** Admin-facing label. Content: rename freely, nothing breaks. */
  label: string;
  group: MechanismGroup;
  /**
   * What the renderer / resolver does when this is ON. Written as a sentence a
   * non-engineer can check against the UI, because they are the ones toggling it.
   */
  effect: string;
  /**
   * Mechanisms whose being ON is required for this one to mean anything.
   * The editor greys nothing out — it simply refuses to save a row that turns
   * this on without its requirements, and says which.
   */
  requires?: string[];
  /**
   * True when the mechanism moves money or creates a legal obligation. These
   * rows are never editable by a seller, now or later, and changing one is on
   * the two-admin threshold list.
   */
  moneyPath?: boolean;
}

export const mechanismsSeedData: MechanismDefinition[] = [
  // ── commerce ───────────────────────────────────────────────────────────────
  {
    id: "addToCart",
    label: "Add to cart",
    group: "commerce",
    effect: "The listing shows a cart CTA and can be bought alongside other items.",
  },
  {
    id: "buyNow",
    label: "Buy now",
    group: "commerce",
    effect: "A single-item checkout CTA appears beside the cart CTA.",
    requires: ["addToCart"],
  },
  {
    id: "offers",
    label: "Public offers",
    group: "commerce",
    effect:
      "Buyers may offer any amount; every offer is public, and the sale concludes when the window closes.",
  },
  {
    id: "autoAward",
    label: "Auto-award at close",
    group: "commerce",
    effect:
      "Seller-selectable per listing. ON: the highest offer wins automatically. OFF: the seller picks within 48h.",
    requires: ["offers"],
  },
  {
    id: "buyoutCap",
    label: "Publishable buyout cap",
    group: "commerce",
    effect: "The seller may publish a price that ends the offer window immediately.",
    requires: ["offers"],
  },
  {
    id: "groupedPurchase",
    label: "Grouped purchase",
    group: "commerce",
    effect: "Several items sell as one unit, all-or-nothing on stock and cancellation.",
  },

  // ── pricing ────────────────────────────────────────────────────────────────
  {
    id: "discountPricing",
    label: "Struck-through pricing",
    group: "pricing",
    effect: "A was-price renders beside the price, and the discount becomes a facet.",
  },
  {
    id: "preOrderWindow",
    label: "Pre-order window",
    group: "pricing",
    effect:
      "The listing sells before it exists, showing a ship window; the card is charged on dispatch.",
    moneyPath: true,
  },
  {
    id: "wholesaleTiers",
    label: "Wholesale tiers / MOQ",
    group: "pricing",
    effect: "Quantity breaks and a minimum order quantity apply. (Phase 4 — off everywhere today.)",
    moneyPath: true,
  },

  // ── fulfilment ─────────────────────────────────────────────────────────────
  {
    id: "physicalShipping",
    label: "Physical shipping",
    group: "fulfilment",
    effect:
      "Shipping estimation, labels and a delivery address are required; the order gains packed/shipped states.",
  },
  {
    id: "instantFulfilment",
    label: "Instant fulfilment",
    group: "fulfilment",
    effect: "Delivered at purchase. The shipping widgets do not resolve at all on this listing.",
  },
  {
    id: "partCompatibility",
    label: "Part compatibility",
    group: "fulfilment",
    effect: "The listing declares what it fits, and compatibility becomes a facet.",
  },
  {
    id: "returnsAllowed",
    label: "Returns allowed",
    group: "fulfilment",
    effect: "A return window opens on delivery and the return flow is offered.",
    moneyPath: true,
  },

  // ── trust ──────────────────────────────────────────────────────────────────
  {
    id: "reveal",
    label: "Surprise / reveal",
    group: "trust",
    effect:
      "Contents are allocated at a reveal (scheduled, or on purchase). A risk banner becomes a required element.",
    moneyPath: true,
  },
  {
    id: "cancelLockedByReveal",
    label: "Cancel locked by the reveal",
    group: "trust",
    effect:
      "Cancellation is allowed until the REVEAL, not until the confirmation. After it, cancel is not a transition.",
    requires: ["reveal"],
    moneyPath: true,
  },
  {
    id: "authenticityProof",
    label: "Authenticity proof required",
    group: "trust",
    effect: "The seller must attach proof before publishing, and the badge is a required card element.",
  },
  {
    id: "jurisdictionCheck",
    label: "Jurisdiction check",
    group: "trust",
    effect: "Checkout validates the buyer's jurisdiction before accepting payment.",
    moneyPath: true,
  },
  {
    id: "verifiedSellerOnly",
    label: "Verified seller only",
    group: "trust",
    effect: "Only a KYC-verified seller may publish this; unverified sellers do not see the type.",
  },

  // ── loyalty ────────────────────────────────────────────────────────────────
  {
    id: "coinsEarn",
    label: "Earns coins",
    group: "loyalty",
    effect: "The buyer earns coins on this purchase, credited on dispatch.",
    moneyPath: true,
  },
  {
    id: "coinsRedeem",
    label: "Redeemable with coins",
    group: "loyalty",
    effect: "Coins may be spent against this listing, up to the redemption cap in the coin rule set.",
    moneyPath: true,
  },

  // ── content ────────────────────────────────────────────────────────────────
  {
    id: "mediaGallery",
    label: "Media gallery",
    group: "content",
    effect: "A multi-image gallery renders, subject to the media rules (minimum count, aspect, size).",
  },
  {
    id: "specTable",
    label: "Specification table",
    group: "content",
    effect: "Attributes render as a table, fed by the wiki as an internal data service.",
  },
  {
    id: "codePool",
    label: "Code pool",
    group: "content",
    effect: "Stock is a pool of issuable codes rather than a count of objects.",
    requires: ["instantFulfilment"],
  },
];

/** Lookup by id — the only way consumers should reach a mechanism definition. */
export const mechanismsById: Readonly<Record<string, MechanismDefinition>> =
  Object.freeze(Object.fromEntries(mechanismsSeedData.map(m => [m.id, m])));

/**
 * The shape every listing type's flag map must satisfy: one boolean per
 * mechanism, no gaps. A missing key is a config error, not an implied `false` —
 * because an implied false is how "we forgot" becomes indistinguishable from
 * "we decided".
 */
export const MECHANISM_IDS: readonly string[] = mechanismsSeedData.map(m => m.id);
