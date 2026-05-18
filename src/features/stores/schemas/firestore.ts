/**
 * Stores Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants,
 * and helpers for the stores feature.
 */

import { slugify } from "../../../utils/string.formatter";
import type { StoreCapability } from "../../auth/permissions/constants";

// -- Shipping config ----------------------------------------------------------

export type ShippingProviderType =
  | "shiprocket"
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
    /** Flat fee in paise. */
    flatInPaise?: number;
    /** Per-kg surcharge in paise. */
    perKgInPaise?: number;
    /** Percentage of order subtotal (0–100). */
    percentOfOrder?: number;
    /** If order subtotal exceeds this threshold, shipping is free. */
    freeAboveInPaise?: number;
    /** Minimum charge in paise (floor after all other rules). */
    minInPaise?: number;
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

// -- Store Document -----------------------------------------------------------

export const StoreStatusValues = {
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
} as const;

export type StoreStatus =
  (typeof StoreStatusValues)[keyof typeof StoreStatusValues];

export interface StoreDocument {
  id: string; // = storeSlug
  storeSlug: string;
  ownerId: string; // references users/{uid}

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

  // ── WhatsApp Business integration (per-store, seller-managed) ─────────────
  whatsappConfig?: {
    /** Seller's WhatsApp Business phone number, digits-only with country code e.g. "919876543210" */
    phoneNumber?: string;
    /** Meta WABA ID for this store */
    wabaId?: string;
    /** Meta Commerce Catalog ID linked to this store */
    catalogId?: string;
    /** Encrypted access token (AES-256-GCM via encryptPii) — never returned to client */
    accessToken?: string;
    /** Whether catalog sync is enabled for this store */
    catalogSyncEnabled: boolean;
    /** Timestamp of last successful catalog sync */
    lastCatalogSyncAt?: Date;
    /** Number of products synced in last run */
    lastSyncCount?: number;
    /** Status of last sync attempt */
    lastSyncStatus?: "success" | "partial" | "failed";
    /** True when wabaId + catalogId + accessToken are all set */
    connected: boolean;
    /** When the seller first connected their account */
    connectedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

// Re-export StoreCapability so consumers can import from this module
export type { StoreCapability } from "../../auth/permissions/constants";

export const STORE_COLLECTION = "stores" as const;

export const STORE_FIELDS = {
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
