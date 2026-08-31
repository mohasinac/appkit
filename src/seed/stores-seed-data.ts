/*
 * WHY: Provides a minimal set of seed stores for the Beyblade-focused demo catalog.
 * WHAT: Exports 3 StoreDocument partials — letitrip-official (platform's first-party store,
 *       kept for admin/catalogue flows that assume one exists), beyblade-arena (the
 *       Beyblade specialist storefront that owns the seeded product catalog), and
 *       tester-qa-seller (the dedicated isTester account's own seller store).
 *
 * EXPORTS:
 *   storesSeedData — array of 3 Partial<StoreDocument> for the seed runner
 *
 * @tag domain:stores
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/runner.ts
 * @tag sideEffects:none
 */

import type { StoreDocument } from "../features/stores/schemas";
import { withStoreSearchTxt } from "./_helpers/search-txt-wrappers";
import { STORE_FIELDS } from "../constants/field-names";
import type { StoreCapability } from "../features/auth/permissions/constants";
import { seedPhoto } from "./_helpers/media";
import type { FieldChange, StatusChangeEntry } from "../_internal/shared/history/types";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/**
 * A timeline entry for the W18 `statusHistory` fixtures.
 *
 * Dates come from this file's own `daysAgo()`, never `Date.now()` in an ID
 * position (Root Cause #25). `actorUid` only, never a name — `withHistory`
 * scrubs PII from real writes, and a fixture carrying a name would be the one
 * place that rule is broken.
 */
function entry(
  at: Date,
  actorRole: "system" | "admin" | "buyer" | "seller",
  trigger: string,
  changes: Record<string, FieldChange>,
  extra?: { reason?: string; note?: string; actorUid?: string },
): StatusChangeEntry {
  return { at, actorRole, trigger, changes, ...extra };
}

const _rawstoresSeedData: Partial<StoreDocument>[] = [
  // ── Store 1: LetItRip Official (admin-owned, platform storefront) ──────────
  {
    id: "store-letitrip-official",
    storeSlug: "store-letitrip-official",
    ownerId: "user-admin-letitrip",
    storeName: "LetItRip Official",
    storeDescription:
      "The official LetItRip curated store. Hand-picked, authenticated collectibles with every item personally inspected before listing.",
    storeCategory: "category-spinning-tops",
    storeLogoURL: seedPhoto("store-logo-letitrip-official-20260101", 400, 400),
    storeBannerURL: seedPhoto("store-banner-letitrip-official-20260101", 1600, 400),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Curated by the LetItRip team. All items authenticated before listing. Fast dispatch, collector-grade packaging.",
    location: "Mumbai, Maharashtra, India",
    website: "https://letitrip.in",
    socialLinks: {
      instagram: "https://instagram.com/letitrip",
      facebook: "https://facebook.com/letitrip",
      twitter: "https://twitter.com/letitrip",
    },
    returnPolicy:
      "7-day hassle-free returns on all items. Items must be in original condition. Full refund or replacement guaranteed.",
    shippingPolicy:
      "Free shipping on orders above ₹999. Orders dispatched within 24 hours. 3–5 business day delivery across India. Express shipping available.",
    shippingConfig: {
      defaultProviderId: "provider-letitrip-standard",
      providers: [
        {
          providerId: "provider-letitrip-standard",
          label: "Standard Shipping",
          type: "custom" as const,
          fee: { flat: 49, freeAbove: 999 },
          etaDaysMin: 3,
          etaDaysMax: 5,
          requiresAwbUpload: true,
        },
        {
          providerId: "provider-letitrip-express",
          label: "Express Shipping",
          type: "custom" as const,
          fee: { flat: 99 },
          etaDaysMin: 1,
          etaDaysMax: 2,
          requiresAwbUpload: true,
        },
        {
          providerId: "provider-letitrip-pickup",
          label: "Store Pickup (Mumbai HQ)",
          type: "store-pickup" as const,
          fee: { flat: 0 },
          etaDaysMin: 0,
          etaDaysMax: 1,
        },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    emiEnabled: true,
    // No seeded store set either flag before 2026-08-24, so the verification
    // badge and every featured-store surface rendered from empty data — and the
    // public /stores "Featured" toggle (which only started filtering at all in
    // the same change) had nothing to match.
    isVerified: true,
    isFeatured: true,

    stats: {
      totalProducts: 0,
      itemsSold: 0,
      totalReviews: 5,
      averageRating: 4.8,
    },
    capabilities: [
      "host_auctions",
      "host_preorders",
      "verified_seller",
      "create_coupons",
      "suggest_brands",
      "bulk_listing_import",
      "featured_placement",
      "promotional_banner",
      "advanced_analytics",
      "api_access",
      "multiple_stores",
      "early_access_features",
      "whatsapp_catalog_sync",
    ] as StoreCapability[],
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },

  // ── Store 2: Beyblade Arena (spinning tops specialist) ────────────────────
  {
    id: "store-beyblade-arena",
    storeSlug: "store-beyblade-arena",
    ownerId: "user-tyson-blader",
    storeName: "Beyblade Arena",
    storeDescription:
      "Everything Beyblade — X, Burst, Metal Fight, and vintage original series. Takara-Tomy authentic stock, tournament-grade stadiums, launchers, and rare limited editions.",
    storeCategory: "category-spinning-tops",
    storeLogoURL: seedPhoto("store-logo-beyblade-arena-20260101", 400, 400),
    storeBannerURL: seedPhoto("store-banner-beyblade-arena-20260101", 1600, 400),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Beyblade champion turned seller. Importing authentic Takara-Tomy Beyblades directly from Japan. Let It Rip!",
    location: "Chennai, Tamil Nadu, India",
    socialLinks: { instagram: "https://instagram.com/beybladearena.in" },
    returnPolicy: "7-day returns on sealed items. No returns on used/battled Beyblades.",
    shippingPolicy: "Free shipping above ₹599. All items shipped in protective bubble wrap.",
    shippingConfig: {
      defaultProviderId: "provider-beyblade-standard",
      providers: [
        { providerId: "provider-beyblade-standard", label: "Standard", type: "custom" as const, fee: { flat: 45, freeAbove: 599 }, etaDaysMin: 3, etaDaysMax: 6, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    emiEnabled: true,
    isVerified: true,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 6, averageRating: 4.8 },
    // `host_auctions` added 2026-08-24. Every one of the seeded auctions belongs
    // to this store, but its owner could not have created any of them:
    // `createSellerProductAction` throws AuthorizationError for
    // `listingType === "auction"` without this capability. The only store that
    // had it (letitrip-official) owns zero auctions, so no seeded seller could
    // walk a successful auction-create flow except by logging in as admin,
    // which bypasses the gate entirely.
    capabilities: ["host_auctions", "host_preorders", "verified_seller", "create_coupons", "suggest_brands"] as StoreCapability[],
    createdAt: daysAgo(150),
    updatedAt: daysAgo(4),
  },

  // ── Store 3: Tester QA Seller Store (owned by the dedicated isTester account) ──
  {
    id: "store-tester-qa-seller",
    storeSlug: "store-tester-qa-seller",
    ownerId: "user-tester-qa",
    storeName: "Tester QA Seller Store",
    storeDescription:
      "Personal seller store for the dedicated QA tester account — used to exercise seller-side flows (listing, orders, payouts) from the Tester Hub checklist.",
    storeCategory: "category-spinning-tops",
    storeLogoURL: seedPhoto("store-logo-tester-qa-seller-20260101", 400, 400),
    storeBannerURL: seedPhoto("store-banner-tester-qa-seller-20260101", 1600, 400),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "QA tester's own seller store — auto-approved via the isTester flag.",
    location: "Bengaluru, Karnataka, India",
    returnPolicy: "N/A — QA test store.",
    shippingPolicy: "N/A — QA test store.",
    shippingConfig: {
      defaultProviderId: "provider-tester-standard",
      providers: [
        { providerId: "provider-tester-standard", label: "Standard", type: "custom" as const, fee: { flat: 49, freeAbove: 999 }, etaDaysMin: 3, etaDaysMax: 5, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    /*
     * Reachable, but never advertised to search engines.
     *
     * This is a QA store — real enough for a tester to exercise seller flows
     * against, and not something that belongs in Google's index. `isTestData`
     * is what the codebase already uses to express that: the sitemap's store
     * fetcher filters it out (it has no viewer), public store listings hide
     * it, and `canViewTestData()` keeps it visible to testers and admins — so
     * the checklist case linking to `/stores/store-tester-qa-seller` still
     * resolves.
     *
     * 🛑 NOTE the deliberate absence of `testDataExpiresAt`. Every sandbox
     * FIXTURE carries one; this store is permanent. `getTestDataRefs` skips
     * docs without an expiry on the force-purge path precisely so
     * `tester:purge-sandbox --force` cannot delete it. Do not add an expiry
     * here — that would put a permanent seed store in range of the sweep.
     */
    isTestData: true,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 0, averageRating: 0 },
    capabilities: ["host_preorders", "verified_seller", "create_coupons"] as StoreCapability[],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // ── Store 4: pending seller application ───────────────────────────────────
  // `StoreStatus` is pending|active|suspended|rejected, but every seeded store
  // was `active` — so three of the four admin status chips could only ever
  // return an empty list, and the seller-approval queue had nothing in it.
  {
    id: "store-blader-bazaar",
    storeSlug: "store-blader-bazaar",
    ownerId: "user-meera-bey",
    storeName: "Blader Bazaar",
    storeDescription:
      "Applied to sell refurbished Burst-era tops and spare parts. Awaiting review — not yet visible to buyers.",
    storeCategory: "category-beyblade-burst",
    storeLogoURL: seedPhoto("store-logo-blader-bazaar-20260101", 400, 400),
    storeBannerURL: seedPhoto("store-banner-blader-bazaar-20260101", 1600, 400),
    status: STORE_FIELDS.STATUS_VALUES.PENDING,
    bio: "Refurbishing and reselling Burst-era tops and parts.",
    location: "Pune, Maharashtra, India",
    returnPolicy: "7-day returns once approved.",
    shippingPolicy: "Standard courier, dispatch within 48 hours.",
    // A pending store is not public — this pairing is the point of the fixture:
    // public visibility gates on `status`/`isPublic`, not on the user doc's own
    // storeStatus, and the two are separate fields.
    isPublic: false,
    isVacationMode: false,
    isVerified: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 0, averageRating: 0 },
    capabilities: ["suggest_brands", "create_coupons"] as StoreCapability[],
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },

  // ── Store 5: suspended store ──────────────────────────────────────────────
  // Exercises `suspensionReason`, which no seeded row populated, and gives the
  // admin "Suspended" chip a row.
  {
    id: "store-vintage-vault-co",
    storeSlug: "store-vintage-vault-co",
    ownerId: "user-sneha-vintage",
    storeName: "Vintage Vault Co.",
    storeDescription:
      "Vintage original-series specialist. Currently suspended pending a listing-authenticity review.",
    storeCategory: "category-beyblade-original",
    storeLogoURL: seedPhoto("store-logo-vintage-vault-20260101", 400, 400),
    storeBannerURL: seedPhoto("store-banner-vintage-vault-20260101", 1600, 400),
    status: STORE_FIELDS.STATUS_VALUES.SUSPENDED,
    suspensionReason:
      "Three listings flagged as possible reproductions; suspended while authenticity documentation is reviewed.",
    adminNotes: "Owner responsive. Re-review once COAs are supplied.",
    bio: "Original-series collector turned seller.",
    location: "Kolkata, West Bengal, India",
    returnPolicy: "14-day returns on sealed items.",
    shippingPolicy: "Insured courier only.",
    isPublic: false,
    isVacationMode: false,
    isVerified: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 0, averageRating: 0 },
    capabilities: ["suggest_brands"] as StoreCapability[],
    createdAt: daysAgo(220),
    updatedAt: daysAgo(9),
    /*
     * active -> suspended, with the admin who did it and why. This is the
     * fixture behind "a suspended store's page shows who suspended it" — the
     * answer was previously only in adminAuditLog, which the store owner can
     * never see.
     *
     * `isPublic` moves WITH `status`, which is the invariant the admin PATCH
     * route was breaking until 2026-08-26 (it wrote status alone, leaving an
     * approved store active and invisible).
     */
    statusHistory: [
      entry(
        daysAgo(9),
        "admin",
        "adminStorePatch",
        {
          status: { from: "active", to: "suspended" },
          isPublic: { from: true, to: false },
          suspensionReason: {
            from: null,
            to: "Three listings flagged as possible reproductions; suspended while authenticity documentation is reviewed.",
          },
        },
        {
          actorUid: "user-admin-letitrip",
          reason:
            "Three listings flagged as possible reproductions; suspended while authenticity documentation is reviewed.",
        },
      ),
    ],
  },
];

/**
 * Tokens derived here, not per record — see _helpers/search-txt-wrappers.ts for
 * why the wrapper form is what makes omission impossible.
 */
export const storesSeedData: Partial<StoreDocument>[] =
  _rawstoresSeedData.map(withStoreSearchTxt);
