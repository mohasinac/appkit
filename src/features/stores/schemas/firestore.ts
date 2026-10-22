/**
 * Stores Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants,
 * and helpers for the stores feature.
 */

import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import { slugify } from "../../../utils/string.formatter";
import type { StoreCapability } from "../../auth/permissions/constants";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

// -- Shipping config ----------------------------------------------------------

export type ShippingProviderType =
  | "self-courier"
  | "store-pickup"
  | "custom";

export interface ShippingProviderConfig {
  /** Stable slug — never changes after creation. */
  providerId: string;
  /** Buyer-facing label (e.g. "Standard Shipping", "Store Pickup"). */
  label: string;
  type: ShippingProviderType;
  fee: {
    /** Flat fee, decimal rupees. */
    flat?: number;
    /** Per-kg surcharge, decimal rupees. */
    perKg?: number;
    /** Percentage of order subtotal (0–100). */
    percentOfOrder?: number;
    /** If order subtotal exceeds this threshold, shipping is free. */
    freeAbove?: number;
    /** Minimum charge, decimal rupees (floor after all other rules). */
    min?: number;
  };
  etaDaysMin: number;
  etaDaysMax: number;
  /** Pincode-prefix or state allowlist; empty = all India. */
  regions?: string[];
  /**
   * When true the seller's order-detail page prompts for an AWB upload
   * after marking the order as shipped.
   */
  requiresAwbUpload?: boolean;
}

export interface StoreShippingConfig {
  providers: ShippingProviderConfig[];
  /** providerId that pre-selects in the ShippingPicker. */
  defaultProviderId: string;
}

/**
 * How this store prices shipping — C5b.
 *
 * 🛑 On the STORE, not on the owner's user document, which is where the old
 * flat number lived (`user.shippingConfig.customShippingPrice`). Shipping is
 * charged per store and `splitCartIntoOrderGroups` groups on `storeId`, so the
 * policy has to live at the granularity it is billed at — a user who owns two
 * stores would otherwise price both the same (Root Cause #65's shape).
 *
 * Absent means `DEFAULT_STORE_SHIPPING_POLICY` (`free`), which preserves what
 * an unconfigured store already did: the old `?? 0` charged the buyer nothing.
 * See `toStoreShippingPolicy` for why `free` and not `estimate`.
 */
export interface StoreShippingPolicyField {
  mode:
    | { kind: "free" }
    | { kind: "flat"; amount: number }
    | { kind: "estimate" };
  /** Goods value at or above which shipping is free, whatever the mode. */
  freeAbove?: number;
}

// -- Store Document -----------------------------------------------------------

export const StoreStatusValues = {
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
} as const;

export type StoreStatus =
  (typeof StoreStatusValues)[keyof typeof StoreStatusValues];

export interface StoreDocument extends BaseDocument {
  /** Normalized edge-n-gram search field — see appkit/src/utils/search-txt.ts. */
  searchTxt?: string[];

  storeSlug: string;
  ownerId: string; // references users/{uid}

  /** Test-data flag — set on the shared admin-seeded test store; swept by testDataCleanup. */
  isTestData?: boolean;
  /** When isTestData, the cutoff after which testDataCleanup deletes this doc. */
  testDataExpiresAt?: Date;

  storeName: string;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;

  status: StoreStatus;

  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };

  returnPolicy?: string;
  shippingPolicy?: string;

  isPublic: boolean;
  isFeatured?: boolean;
  isVacationMode?: boolean;
  vacationMessage?: string;

  // ── Admin moderation fields (admin-only writes via updateStoreSchema) ────────
  /** Internal admin note, never shown to the store owner or the public. */
  adminNotes?: string;
  /** Admin "verified store" badge — distinct from `status`/`isPublic`. */
  isVerified?: boolean;
  /**
   * Paid at SHIPPING rather than at delivery.
   *
   * 🛑 **A risk transfer, not a courtesy or a badge.** Paying before delivery
   * means the platform carries a lost parcel and a non-delivery dispute with
   * the money already gone. Admin-granted only, `recordAdminAction`-logged,
   * revocable — and **PRIVATE in the public projection**, because it describes
   * our risk posture rather than anything a buyer should weigh. A store does
   * not get to display that we trust it.
   *
   * 🛑 A faster path through the SAME machinery, never a second one. The
   * eligibility sweep moves the delivered-status test, not the payout, the
   * hold, the deductions or the dispatch.
   *
   * 🛑 **A refund after a trusted payout has no money left to net against.**
   * The ordinary path deducts from a still-`pending` payout; once paid there
   * is nothing to deduct from, so it becomes a `manual_refund_due` case —
   * which already exists and already means exactly this. Never a negative
   * payout.
   */
  trustedSeller?: boolean;
  /** Reason recorded when `status` is set to "suspended". */
  suspensionReason?: string;

  stats?: {
    totalProducts: number;
    itemsSold: number;
    totalReviews: number;
    averageRating?: number;
  };

  // ── Vacation mode (S-STORE-6-A — `isVacationMode` + `vacationMessage` already declared above; this adds the optional return date.) ──
  /** When the seller plans to return. Banner shows the date if set. */
  vacationReturnDate?: Date | string;

  // ── Store capabilities (admin-controlled feature flags) ──────────────────────
  /**
   * Explicit capability set for this store. Defaults: ["suggest_brands", "create_coupons"].
   * Checked server-side on every relevant API route.
   */
  capabilities?: StoreCapability[];
  /**
   * Custom platform commission rate (0–100 as a percentage).
   * Only meaningful when capabilities includes "lower_commission_rate".
   */
  customCommissionRate?: number;

  // ── Google Business Reviews (per-store, seller-managed) ──────────────────
  googleReviews?: {
    placeId: string;
    enabled: boolean;
    maxReviews?: number;
    minRating?: number;
    layout?: "grid" | "carousel";
  };

  // ── Shipping provider config (S-SBUNI-RULES 2026-05-13) ─────────────────────
  /**
   * Shipping providers available for this store. Buyers pick one in the cart
   * ShippingPicker; the chosen provider + fee lock onto each CartItem.
   */
  shippingConfig?: StoreShippingConfig;

  /**
   * Seller opt-in for EMI (installment) checkout. EMI is offered on this
   * store's items only when this AND `siteSettings.emi.enabled` are both
   * true. Default false — sellers must explicitly opt in.
   */
  emiEnabled?: boolean;

  /**
   * How this seller THINKS about the prices they type. An authoring
   * convenience, and nothing more.
   *
   * 🛑 **Every stored `price` in this system is tax-INCLUSIVE** — it is what
   * the buyer pays, with GST inside it, remitted from it. No money path
   * branches on this flag, and that is deliberate: a mode read in five places
   * is five places to drift, which is the defect family C0/C0c spent its
   * whole length removing.
   *
   * `true` (the default) — the seller types the buyer-facing price. ₹999 at 5%
   * means the buyer pays ₹999 and the seller earns from a ₹951.43 taxable
   * value.
   *
   * `false` — the seller types an EX-TAX price, and `ProductRepository`
   * grosses it up **once, at write time**: ₹999 at 5% is stored as ₹1,048.95,
   * so the buyer pays ₹1,048.95 and the seller earns from ₹999.00.
   *
   * Default `true`, which matters twice. It is the Indian B2C convention
   * (and what worldhobbyshop asserts in its own JSON-LD via
   * `valueAddedTaxIncluded: true`); and it means enabling GST changes no
   * displayed price, where defaulting to `false` would raise every listing in
   * the catalogue the moment the switch was flipped.
   *
   * 🛑 Flipping this does NOT re-price existing listings. The gross-up happens
   * at write, so a seller who switches must re-save (or have re-derived) the
   * products they want converted — see `ProductRepository`.
   */
  pricesIncludeGst?: boolean;

  /*
   * ── Tax identity ────────────────────────────────────────────────────────
   *
   * Added 2026-10-19. Until then there was NO seller-level tax identity
   * anywhere on this document, and every order invoiced under the platform's
   * own `siteSettings.gst` — while the seeded FAQ `faq-gst-invoice` told
   * buyers that "sellers who are GST-registered include GST details on the
   * invoice", which the system could not do.
   *
   * 🛑 The resolution order is SELLER FIRST, PLATFORM OTHERWISE, and it lives
   * in exactly one function — `resolveSupplierIdentity` in
   * `_internal/server/features/checkout/supplier-identity.ts`. Do not inline
   * a `store.gstin ?? settings.gst.gstin` chain at a call site: Root Cause #75
   * is a money rule copied to four places where two copies missed a branch.
   *
   * 🛑 These are the identity of the SUPPLIER OF RECORD, so they are snapshot
   * onto the order at creation and never recomputed. Changing them affects
   * future orders only.
   */

  /**
   * The seller's own 15-character GSTIN, when they have one.
   *
   * Absent/empty means unregistered, and the order then carries the
   * platform's GSTIN. Validate with the existing `isValidGstin` (shape AND
   * base-36 checksum) — never a second regex.
   */
  gstin?: string;

  /**
   * Registered legal name, when it differs from `storeName`.
   *
   * "Beyblade Arena" is a storefront; "Arena Collectibles Pvt Ltd" is who
   * issues the invoice. Absent means the platform's legal name is used
   * alongside the platform GSTIN — the two always travel together, because a
   * GSTIN under the wrong legal name is a worse invoice than neither.
   */
  legalName?: string;

  /** Registered address as it should appear on the invoice. */
  registeredAddress?: string;

  /**
   * How this store PRICES shipping — C5b. Absent means `free`.
   *
   * 🛑 Named `shippingPricing`, not `shippingPolicy`, because
   * `shippingPolicy` is ALREADY taken on this document by the seller's
   * free-text shipping prose. `tsc` caught the collision; the two are
   * genuinely different things (prose a buyer reads vs. a rule that computes
   * money) and sharing a name would have made one of them unreadable.
   *
   * 🛑 PRIVATE. It is a commercial setting, and `estimate` additionally
   * reveals that this seller's parcels are booked through our carrier
   * account. Triaged into `PRIVATE_STORE_FIELDS`; the buyer sees the
   * resulting AMOUNT at checkout, never the rule that produced it.
   */
  shippingPricing?: StoreShippingPolicyField;

  /**
   * ── Buyer protections, TIER 2 — C5e ──────────────────────────────────────
   *
   * Whether this seller has agreed to be held to each cover. Seller-settable
   * in their own settings; the admin's platform-wide toggles are TIER 1
   * (`siteSettings.commissions.*FeeEnabled`) and item eligibility is TIER 3.
   * All three must pass. See
   * `_internal/shared/features/shipping/protections.ts`.
   *
   * 🛑 ABSENT MEANS NOT SUPPORTED, never "unknown". A tri-state where
   * `undefined` renders neither a badge nor a risk notice is the worst of the
   * three outcomes — the buyer gets no signal at all and cannot tell a seller
   * who declined from one who has not been asked. So both default `false`,
   * which honestly means every existing store shows the notice on day one.
   * That is the correct starting state, not a migration problem: defaulting
   * them `true` would enrol every existing seller in a liability they never
   * accepted.
   *
   * 🛑 Both are PUBLIC and deliberately so — the safety badge and the
   * pre-purchase risk notice are buyer-facing by definition. That is the rare
   * case where public is right for a new store field, and it has to be NAMED
   * in `PUBLIC_STORE_FIELDS` rather than assumed (Root Cause #70).
   */
  supportsShippingProtection?: boolean;
  supportsSaleProtection?: boolean;

  /**
   * This store accepts buyer points as part-payment.
   *
   * ## 🛑 OPT-IN, because the accepting store ABSORBS the redemption
   *
   * Decision 3: a redeemed point reduces THAT store's payout for THAT order.
   * Earning is mandatory (it costs the seller nothing at issue time); accepting
   * is optional, because accepting is where the money actually moves. So this
   * follows `supportsSaleProtection` above exactly — **absent means NOT
   * accepted, never "unknown"** — and for the identical reason: defaulting it
   * `true` would enrol every existing seller in funding discounts they never
   * agreed to, and retrofitting consent later means switching a working feature
   * off for them.
   *
   * 🛑 Live currently has ONE store, so this flag is inert today. It is still
   * built now rather than later: the day a second seller exists, enabling
   * redemption for them without asking is taking their money, and the cost of
   * the field today is one boolean and one check.
   *
   * `store-letitrip-official` is always treated as accepting — the platform's
   * own storefront cannot decline to fund its own programme. That is resolved
   * in code rather than seeded, so it cannot be switched off by an edit.
   */
  acceptsPoints?: boolean;
  // (see PLATFORM_STORE_ID, declared at the end of this file)

  /**
   * ── S5a: this store allows a SHARED PURCHASE (one payer, N destinations) ──
   *
   * The coordinator buys everything and assigns a destination per item, so the
   * seller packs one order into several parcels. That is real extra work —
   * picking, packing and labelling N shipments instead of one — which is why
   * it is an opt-in with its own fees rather than a free platform behaviour.
   *
   * 🛑 **Absent means NOT allowed**, matching `supportsSaleProtection` and
   * `acceptsPoints` above, and for the same reason: the cost falls on the
   * seller, so enrolling them without asking is taking their labour. Every
   * existing store therefore starts with it off, which is the correct state
   * rather than a migration problem.
   *
   * 🛑 This is S5a ONLY — one payer. It is NOT the N-party flow (S5b), which
   * needs multi-party payment, a coordinator deposit, an approval cascade, a
   * stock-reservation primitive that does not exist, and per-buyer invoicing
   * and GST. A seller enabling this is agreeing to split one paid order across
   * destinations, not to be paid by several people.
   */
  allowSharedPurchase?: boolean;
  /**
   * Flat fee per shared-purchase arrangement, in decimal rupees.
   *
   * Covers picking, packing and labelling one order into N parcels. Borne by
   * the COORDINATOR — they chose the arrangement — which keeps each
   * destination's own cost to goods plus that destination's shipping.
   *
   * 🛑 SNAPSHOTTED onto the order at checkout, never re-read later. The
   * precedent is exact: the refund path reads `finalSale` from the ORDER
   * snapshot rather than the live product, because "re-reading the live
   * product would let a seller flip the switch afterwards" (D61). A fee read
   * late is the same hole.
   */
  sharedPurchaseHandlingFee?: number;
  /**
   * Extra shipping per destination BEYOND THE FIRST, in decimal rupees.
   *
   * The first destination is the shipping the order would have paid anyway;
   * this is the marginal cost of each additional parcel. Borne by the buyer at
   * that destination in the full N-party flow — in S5a there is one payer, so
   * the coordinator pays all of it, which is correct because they are the
   * person who asked for the extra legs.
   *
   * Snapshotted with the handling fee, for the same reason.
   */
  sharedPurchaseExtraShippingPerDestination?: number;

  /**
   * ── C5g: ADMIN-GRANTED trust. Routes even a protected claim to the seller ──
   *
   * A sale-protection claim normally ships to our warehouse, because we are the
   * ones underwriting the refund and therefore the ones who need to inspect it.
   * This flag sends it to the seller instead and skips our inspection.
   *
   * 🛑 ADMIN-ONLY, and deliberately NOT next to the two seller-settable
   * `supports*` flags above despite sitting in the same block. The distinction
   * is the whole mechanism: a seller who could set this would be **granting
   * themselves exemption from inspection**, which is exactly the control it
   * exists to impose.
   *
   * 🛑 It must stay out of every seller PATCH schema. A field a seller can send
   * is a field a seller can set (Root Cause #76's write-shape lesson) — and
   * `z.object()` STRIPS unknown keys rather than rejecting them, so a seller
   * route that merely omits it is already safe, while one that spreads the body
   * is not. The verification asserts its absence from the seller routes rather
   * than trusting that nobody adds it.
   */
  returnsDirectToSeller?: boolean;


  /**
   * Who changed what, when, and why. See § "Status History" in CLAUDE.md.
   *
   * The question this answers for a seller is "why is my store suspended and
   * who did it" — previously recoverable only from `adminAuditLog`, which is
   * admin-only and which the seller can never see.
   */
  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
}

/**
 * The fields whose changes earn a timeline entry.
 *
 * `isPublic` is tracked alongside `status` deliberately: the two are supposed
 * to move together (`setStatus` syncs them) and the admin PATCH route did NOT
 * until 2026-08-26, so an approved store stayed invisible. A timeline that
 * shows them diverging is how the next instance gets noticed.
 *
 * `adminNotes` is excluded — its own schema comment says it is never shown to
 * the store owner or the public, and `statusHistory` rides on the store
 * document the owner can read.
 */
export const STORE_TRACKED_FIELDS = [
  "status",
  "isPublic",
  "isVerified",
  "isFeatured",
  "suspensionReason",
  "capabilities",
] as const;

/**
 * PII on this document, for the `withHistory` scrub.
 *
 * `accessToken` stays listed although the WhatsApp integration that produced
 * one was removed 2026-10-20: a scrub list is cheap, and a future secret
 * reaching this document under that name should be scrubbed by default
 * rather than by someone remembering to add it.
 */
export const STORE_HISTORY_PII_FIELDS = [
  "accessToken",
  "payoutDetails",
  "upiVpa",
  "accountNumber",
] as const;

// Re-export StoreCapability so consumers can import from this module
export type { StoreCapability } from "../../auth/permissions/constants";

export const STORE_COLLECTION = "stores" as const;

export const STORE_FIELDS = {
  /** Word-prefix search tokens. Derived on write by `buildSearchTxtFor`. */
  SEARCH_TXT: "searchTxt",
  ID: "id",
  STORE_SLUG: "storeSlug",
  OWNER_ID: "ownerId",
  STORE_NAME: "storeName",
  STORE_DESCRIPTION: "storeDescription",
  STORE_CATEGORY: "storeCategory",
  STORE_LOGO_URL: "storeLogoURL",
  STORE_BANNER_URL: "storeBannerURL",
  STATUS: "status",
  BIO: "bio",
  LOCATION: "location",
  WEBSITE: "website",
  SOCIAL_LINKS: "socialLinks",
  RETURN_POLICY: "returnPolicy",
  SHIPPING_POLICY: "shippingPolicy",
  IS_PUBLIC: "isPublic",
  IS_VACATION_MODE: "isVacationMode",
  VACATION_MESSAGE: "vacationMessage",
  STATS: "stats",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  ADMIN_NOTES: "adminNotes",
  IS_FEATURED: "isFeatured",
  IS_VERIFIED: "isVerified",
  TRUSTED_SELLER: "trustedSeller",
  SUSPENSION_REASON: "suspensionReason",
  CAPABILITIES: "capabilities",

  STATUS_VALUES: {
    PENDING: "pending",
    ACTIVE: "active",
    SUSPENDED: "suspended",
    REJECTED: "rejected",
  },
} as const;

export const DEFAULT_STORE_DATA: Partial<StoreDocument> = {
  status: "pending",
  isPublic: false,
  isVacationMode: false,
  stats: {
    totalProducts: 0,
    itemsSold: 0,
    totalReviews: 0,
  },
};

export function generateStoreSlug(
  storeName: string,
  ownerDisplayName: string,
): string {
  const name = slugify(storeName);
  const owner = slugify(ownerDisplayName?.split(" ")[0] ?? "seller");
  return `${name}-by-${owner}`;
}

// -- Store Address Subcollection ----------------------------------------------
// SB-UNI-A 2026-05-13 — store addresses unified into top-level `addresses`
// collection with `ownerType:"store"`. The types below are kept as aliases
// so existing consumers don't need to rename imports immediately.

import type {
  AddressDocument as _Addr,
  AddressCreateInput as _AddrCreate,
  AddressUpdateInput as _AddrUpdate,
} from "../../addresses/schemas";

export type StoreAddressDocument = _Addr;
export type StoreAddressCreateInput = _AddrCreate;
export type StoreAddressUpdateInput = _AddrUpdate;

export {
  ADDRESS_FIELDS as STORE_ADDRESS_FIELDS,
  ADDRESS_INDEXED_FIELDS as STORE_ADDRESS_INDEXED_FIELDS,
  ADDRESS_PUBLIC_FIELDS as STORE_ADDRESS_PUBLIC_FIELDS,
  ADDRESS_UPDATABLE_FIELDS as STORE_ADDRESS_UPDATABLE_FIELDS,
  DEFAULT_ADDRESS_DATA as DEFAULT_STORE_ADDRESS_DATA,
} from "../../addresses/schemas";

/** @deprecated SB-UNI-A — literal alias only. Use ADDRESSES_COLLECTION. */
export const STORE_ADDRESS_SUBCOLLECTION = "addresses" as const;

/**
 * The platform's own storefront.
 *
 * An IDENTITY, not a setting — it is the same id the seed's `REAL_STORE_IDS`
 * and `realListingsOnly` already treat as the platform's own, and resolving it
 * in code is what stops it being switched off by an edit, a reseed, or a
 * mis-clicked admin toggle. `storeAcceptsPoints` is the motivating reader: the
 * one store the points programme is advertised on cannot be allowed to decline
 * to fund it.
 *
 * 🛑 It lives HERE, in `features/`, and not beside its reader in
 * `_internal/shared/features/points/` — `audit-ssr-in-appkit` Rule 3 forbids a
 * brand-bearing literal inside `_internal/`, because a consumer of appkit would
 * inherit OUR store id with no way to override it. `features/` is where the
 * same literal already lives legitimately (`CONSIGNMENT_STORE_ID` in
 * `features/catalogue/utils/product-from-item.ts`), and this file is the one
 * that already documents the rule on `acceptsPoints` above.
 */
export const PLATFORM_STORE_ID = "store-letitrip-official";
