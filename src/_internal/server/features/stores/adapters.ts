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
  // The seller's free-text shipping PROSE, rendered by StoreAboutView. Not to
  // be confused with `shippingPricing` below, which is the rule that computes
  // money and is private — the names are one word apart and mean opposite
  // things about disclosure.
  "shippingPolicy",
  "isVacationMode",
  "vacationMessage",
  // C5e, and the only two new store fields in this plan that are public. The
  // safety badge and the pre-purchase risk notice are both rendered to an
  // anonymous visitor on the listing and in the cart — withholding them would
  // make "has not opted in" indistinguishable from "we did not tell you",
  // which is the one outcome the tri-state rule forbids.
  "supportsShippingProtection",
  "supportsSaleProtection",
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
  // A seller AUTHORING preference with no public reader by construction: the
  // stored `price` is always tax-inclusive, so a buyer never needs to know how
  // the seller typed it. Read only by `ProductRepository` at write time, and
  // publishing it would invite a client to "correct" a price that is already
  // correct.
  "pricesIncludeGst",
  /*
   * C5b. A commercial setting, and `estimate` additionally reveals that this
   * seller's parcels are booked through OUR carrier account — which is
   * operational detail about us, not a fact about the store. A buyer sees the
   * resulting amount at checkout; the rule that produced it is ours.
   *
   * 🛑 One word from `shippingPolicy` in the PUBLIC list above, and the
   * opposite answer. That is a real hazard — a blind find-replace during this
   * change swapped the two and `tsc` was silent, because both are valid
   * strings in a `const` array. `audit-public-projection-parity` is what would
   * have caught it: a PUBLIC field no projection emits fails.
   */
  "shippingPricing",
  /*
   * C5g. An ADMIN trust decision about this seller, and the opposite call from
   * the two `supports*Protection` flags in the PUBLIC list — which is the point
   * of them being different kinds of field.
   *
   * The `supports*` pair is a PROMISE the seller made and a buyer needs before
   * purchase. This is an internal exemption from our inspection step: it tells
   * a buyer nothing they can act on, and publishing it would advertise which
   * sellers' returns we do not check — a map of where to try a swap.
   */
  "returnsDirectToSeller",
  "isFeatured", // ranking input; not part of the public store profile
  "vacationReturnDate", // not rendered by StoreAboutView; add to PUBLIC when a reader exists
  "isTestData", // tester-sandbox tagging; filtered by filterTestDataForViewer
  "testDataExpiresAt", // ditto
  /*
   * Tax identity (2026-10-19). Read today by exactly two server-side
   * consumers: `resolveSupplierIdentity` (checkout, to decide whose
   * registration an order invoices under) and the seller's own authenticated
   * payout-settings form. Neither is a public store-profile reader.
   *
   * A GSTIN is not secret in the way a bank account number is — it is
   * legally published on an invoice — but "may be disclosed" and "has a
   * reader that needs it published on /stores/{slug}" are different
   * questions, and only the first is true today. Move to PUBLIC_STORE_FIELDS
   * together, with the literal in `toStoreListItem()`, once a storefront
   * surface actually needs to show a seller's registration.
   */
  "gstin",
  "legalName",
  "registeredAddress",
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
    /*
     * 🛑 `?? false` rather than passed through, which is the tri-state rule
     * resolved once. An absent field must reach the client as a definite "not
     * supported" so the risk notice renders; forwarding `undefined` would let a
     * `!== false` test read it as supported, or a truthiness test render
     * neither badge nor notice — the one outcome that tells the buyer nothing.
     */
    supportsShippingProtection: doc.supportsShippingProtection ?? false,
    supportsSaleProtection: doc.supportsSaleProtection ?? false,
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
