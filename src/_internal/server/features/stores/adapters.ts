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
  /*
   * ── D46/D47 + S5a — three more public store flags, same argument ──────────
   *
   * PUBLIC for the tri-state reason the two protection flags above are: the
   * buyer has to know whether this seller will split an order across
   * addresses BEFORE they commit, and withholding it makes "has not opted in"
   * indistinguishable from "we did not tell you".
   *
   * The two shared-purchase FEES are public for a stronger reason still: a
   * coordinator commits to a quoted total, and a handling fee plus N−1
   * shipping legs discovered after they committed is exactly the surprise the
   * arrangement makes expensive.
   */
  "allowSharedPurchase",
  "sharedPurchaseHandlingFee",
  "sharedPurchaseExtraShippingPerDestination",
  /*
   * ── Seller trust, 2026-10-24 ──────────────────────────────────────────────
   *
   * 🛑 `isVerified` MOVED here from PRIVATE, deliberately, and this is a
   * reclassification rather than a drive-by.
   *
   * It was filed as "admin moderation state; surfaced via a separate badge
   * feed if ever needed". That badge feed never existed, and meanwhile three
   * things were already treating the field as public: `/sellers` filters on
   * `isVerified == true` to offer a "verified sellers" view,
   * `StoreCapabilitiesGuideView` told sellers in as many words that "the
   * Verified badge appears on your store profile page and on every listing
   * card", and the seller onboarding checklist offered "Request verified
   * badge" as a step. All three described a public badge; the projection
   * stripped the field, so no badge could render anywhere and the guide copy
   * was simply false.
   *
   * It is a badge, not moderation state — `status` / `isPublic` /
   * `suspensionReason` are the moderation fields and all three stay private
   * or already are public for their own reasons. The named reader is
   * `<SellerTierBadge>`.
   *
   * `sellerTier` and `standing` are public for the same reason: the tier is
   * the whole point of the feature being visible to a buyer, and `standing`
   * carries the METRICS behind it (counts and a mean — no buyer uids, no
   * addresses) so a seller's own dashboard panel can render progress from the
   * store document it already holds without a second read.
   *
   * 🛑 `trustedSeller` stays PRIVATE and must never be added here. It is the
   * money-moving half of the same decision — see its entry below.
   */
  "isVerified",
  "sellerTier",
  "standing",
  "createdAt",
] as const;

/** Everything else, with the reason it stays server-side. */
export const PRIVATE_STORE_FIELDS = [
  /*
   * 🛑 `trustedSeller` — OUR RISK POSTURE, not a badge.
   *
   * It means we pay this store before the parcel is delivered, so the platform
   * carries a lost parcel and a non-delivery dispute. That is a statement
   * about what we are willing to lose, and a buyer has no use for it: it says
   * nothing about the goods, the seller's rating or their dispatch record.
   *
   * Published, it would read as an endorsement — "LetItRip trusts this store"
   * — which is both a claim we never made and an incentive for sellers to
   * compete for the flag. It is admin-granted on risk grounds and revocable;
   * neither survives being visible.
   */
  "trustedSeller",
  /*
   * 🛑 PRIVATE, and it was briefly classified PUBLIC on a mistaken argument
   * worth recording so nobody re-makes it.
   *
   * The argument was "the cart has to show a buyer whether their points can be
   * used HERE before they commit" — which is true, and is NOT a reason for
   * this projection to carry the field. Measured: the cart reads
   * `pricingPreview.stores[].acceptsPoints`, produced by the checkout pricing
   * preview (checkout/actions.ts:2980), and the only client readers are
   * `CartPriceBreakdown.tsx:317` and `CartRouteClient.tsx:1282`, both off that
   * preview. Neither touches `toStoreListItem` / `toStoreDetail`.
   *
   * So the store projection has no reader, and the rule for this file is
   * explicit: a field moves to PUBLIC only once you can NAME the client that
   * reads it from this payload. "A different payload needs it" is not that.
   *
   * A store page could legitimately advertise "accepts points" one day. When a
   * reader exists, move it and add it to both builders — the omission is what
   * `audit-public-projection-parity` caught here (declared PUBLIC, emitted by
   * nothing), which is the half-migrated state that reads as done.
   */
  "acceptsPoints",
  // Internal search index, not content. It is a normalized re-encoding of
  // storeName/description/category — publishing it would leak nothing new, but
  // it has no client reader and would bloat every store payload with a few
  // hundred tokens.
  "searchTxt",
  /*
   * A BILLING RELATIONSHIP between the seller and the platform: whether this
   * store pays the monthly add-on that sends its buyers WhatsApp order
   * updates. The buyer learns about it where it is actually decided — the
   * per-store add-on picker at checkout, which reads the pricing preview, not
   * this projection. Publishing it here would expose which sellers pay us for
   * what, which is commercial terms (same reason `customCommissionRate` is
   * below), and it has no reader on any public store surface.
   */
  "whatsappNotifySubscribed",
  "updatedAt", // bookkeeping; no public reader
  "whatsappConfig", // Meta access token + WABA/catalog ids — secret
  "adminNotes", // schema comment: never shown to the owner or the public
  // Admin decisions with actor UIDs and suspension reasons. The store OWNER
  // sees this on their own admin surfaces; an anonymous visitor to /stores has
  // no business reading who suspended whom and why.
  "statusHistory",
  "statusHistoryTruncated",
  // `isVerified` moved to PUBLIC_STORE_FIELDS on 2026-10-24 — it is a badge,
  // and three surfaces already described it as one. See the note there.
  //
  // `tierLockedByAdmin` is the opposite call: `sellerTier` is public because a
  // buyer should see the badge, but HOW we administer that record — whether an
  // admin pinned it against the monthly recompute — says nothing about the
  // goods or the seller and is nobody's business outside the back office.
  "tierLockedByAdmin",
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
    /*
     * Same `?? false` rule for the same reason — a definite "not offered"
     * rather than an `undefined` a truthiness test reads as neither.
     *
     * 🛑 The two FEES are passed through as `undefined` when unset, and that
     * asymmetry is deliberate: a flag's absence means "no", but a fee's
     * absence means "not configured", which is NOT the same as ₹0. Defaulting
     * them to zero would quote a coordinator a free arrangement from a store
     * that simply has not set a price.
     */
    allowSharedPurchase: doc.allowSharedPurchase ?? false,
    sharedPurchaseHandlingFee: doc.sharedPurchaseHandlingFee,
    sharedPurchaseExtraShippingPerDestination:
      doc.sharedPurchaseExtraShippingPerDestination,
    /*
     * 🛑 `?? false` and `?? "seller"` — the same tri-state rule as the
     * protection flags, for a sharper reason. A badge component testing
     * `undefined` loosely renders nothing, which is correct here, but a
     * component testing `!== false` or `!== "seller"` would render a VERIFIED
     * or TRUSTED badge on a store that has earned neither. Defaulting on the
     * server means no client can make that mistake.
     */
    isVerified: doc.isVerified ?? false,
    sellerTier: doc.sellerTier ?? "seller",
    /*
     * `standing` is passed through as `undefined` when absent, NOT defaulted
     * to a zeroed object. "Never computed" and "computed, and you have zero
     * delivered orders" are different facts, and the panel renders them
     * differently — a confident "0 of 25" on a store that has simply never
     * been measured is the regression Root Cause #72 names.
     */
    standing: doc.standing,
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
