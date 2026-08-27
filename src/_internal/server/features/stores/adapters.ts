/**
 * Store adapters — the single allow-list projection for every public store
 * response, HTTP or SSR.
 *
 * Every field of `StoreDocument` is triaged into exactly one of
 * `PUBLIC_STORE_FIELDS` (mapped into the returned literal) or
 * `PRIVATE_STORE_FIELDS` (with a stated reason). A field added to the schema
 * and to neither list fails `scripts/audit-public-projection-parity.mjs`, so
 * new fields are private by default.
 *
 * Why this exists (2026-08-24): `src/app/[locale]/stores/[storeSlug]/about/
 * page.tsx` passed a raw `StoreDocument` into a `"use client"` component via
 * `as unknown as StoreDetail` — a cast with no runtime effect — so Next.js
 * serialised the whole document into the RSC flight payload embedded in that
 * page's PUBLIC HTML, including the Meta WhatsApp Business `accessToken`
 * (decrypted on every read by `StoreRepository.mapDoc` at the time),
 * `adminNotes`, `suspensionReason` and `customCommissionRate`. The public
 * store *APIs* were clean only because each had hand-rolled its own literal;
 * there were three such copies and the SSR page had none. This module is the
 * one copy they all now share.
 */
import type { StoreDocument } from "../../../../features/stores/schemas/firestore";
import type { StoreDetail, StoreListItem } from "../../../../features/stores/types/index";

/**
 * Document fields that may reach an unauthenticated client. Keep in sync with
 * the object literals below — the audit asserts both directions.
 */
export const PUBLIC_STORE_FIELDS = [
  "id",
  "storeSlug",
  "ownerId",
  "storeName",
  "storeDescription",
  "storeCategory",
  "storeLogoURL",
  "storeBannerURL",
  "status",
  "isPublic",
  "stats",
  "bio",
  "location",
  "website",
  "socialLinks",
  "returnPolicy",
  "shippingPolicy",
  "isVacationMode",
  "vacationMessage",
  "createdAt",
] as const;

/** Everything else, with the reason it stays server-side. */
export const PRIVATE_STORE_FIELDS = [
  // Internal search index, not content. It is a normalized re-encoding of
  // storeName/description/category — publishing it would leak nothing new, but
  // it has no client reader and would bloat every store payload with a few
  // hundred tokens.
  "searchTxt",
  "updatedAt", // bookkeeping; no public reader
  "whatsappConfig", // Meta access token + WABA/catalog ids — secret
  "adminNotes", // schema comment: never shown to the owner or the public
  // Admin decisions with actor UIDs and suspension reasons. The store OWNER
  // sees this on their own admin surfaces; an anonymous visitor to /stores has
  // no business reading who suspended whom and why.
  "statusHistory",
  "statusHistoryTruncated",
  "isVerified", // admin moderation state; surfaced via a separate badge feed if ever needed
  "suspensionReason", // admin moderation note
  "capabilities", // internal feature gating; server-enforced, never client-read
  "customCommissionRate", // commercial terms for this seller
  "googleReviews", // placeId is billed-API config; the RSC reads it server-side
  "shippingConfig", // resolved server-side into per-item shipping at cart time
  "emiEnabled", // read server-side by the checkout/product RSCs, never from a public payload
  "isFeatured", // ranking input; not part of the public store profile
  "vacationReturnDate", // not rendered by StoreAboutView; add to PUBLIC when a reader exists
  "isTestData", // tester-sandbox tagging; filtered by filterTestDataForViewer
  "testDataExpiresAt", // ditto
] as const;

/**
 * Accepted input: a `StoreDocument` (the common case) or a loosely-typed
 * Firestore row. The legacy top-level counters below predate `stats` and are
 * still present on older documents, so they stay as declared fallbacks rather
 * than an index signature — `Record<string, unknown>` would not accept a
 * plain `StoreDocument`.
 */
export type StoreProjectionSource = Partial<StoreDocument> & {
  totalProducts?: number;
  itemsSold?: number;
  totalReviews?: number;
  averageRating?: number;
};

/** `createdAt` is `Date` on the document and `string` on the client types. */
function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

export interface ToStoreListItemOptions {
  /** Reserved for future per-caller shaping (see CLAUDE.md § Encapsulation + Override Contract). */
  readonly _reserved?: never;
}

/**
 * Grid/list projection. Stats are flattened off `stats`, falling back to the
 * legacy top-level counters some older documents still carry.
 */
export function toStoreListItem(
  doc: StoreProjectionSource,
  _opts?: ToStoreListItemOptions,
): StoreListItem {
  const stats = doc.stats;
  return {
    id: doc.id as string,
    storeSlug: doc.storeSlug as string,
    ownerId: doc.ownerId as string,
    storeName: doc.storeName as string,
    storeDescription: doc.storeDescription,
    storeCategory: doc.storeCategory,
    storeLogoURL: doc.storeLogoURL,
    storeBannerURL: doc.storeBannerURL,
    status: doc.status as string,
    isPublic: doc.isPublic as boolean,
    totalProducts: stats?.totalProducts ?? doc.totalProducts,
    itemsSold: stats?.itemsSold ?? doc.itemsSold,
    totalReviews: stats?.totalReviews ?? doc.totalReviews,
    averageRating: stats?.averageRating ?? doc.averageRating,
    createdAt: toIsoString(doc.createdAt),
  };
}

export interface ToStoreDetailOptions extends ToStoreListItemOptions {}

/** Full public store profile — everything `StoreAboutView` renders, nothing more. */
export function toStoreDetail(
  doc: StoreProjectionSource,
  opts?: ToStoreDetailOptions,
): StoreDetail {
  return {
    ...toStoreListItem(doc, opts),
    bio: doc.bio,
    location: doc.location,
    website: doc.website,
    socialLinks: doc.socialLinks,
    returnPolicy: doc.returnPolicy,
    shippingPolicy: doc.shippingPolicy,
    isVacationMode: doc.isVacationMode,
    vacationMessage: doc.vacationMessage,
  };
}
