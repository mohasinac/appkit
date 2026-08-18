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
import { STORE_FIELDS } from "../constants/field-names";
import type { StoreCapability } from "../features/auth/permissions/constants";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const storesSeedData: Partial<StoreDocument>[] = [
  // ── Store 1: LetItRip Official (admin-owned, platform storefront) ──────────
  {
    id: "store-letitrip-official",
    storeSlug: "store-letitrip-official",
    ownerId: "user-admin-letitrip",
    storeName: "LetItRip Official",
    storeDescription:
      "The official LetItRip curated store. Hand-picked, authenticated collectibles with every item personally inspected before listing.",
    storeCategory: "category-spinning-tops",
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-letitrip-official-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-letitrip-official-20260101/1600/400"),
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
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-beyblade-arena-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-beyblade-arena-20260101/1600/400"),
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
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 6, averageRating: 4.8 },
    capabilities: ["host_preorders", "verified_seller", "create_coupons", "suggest_brands"] as StoreCapability[],
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
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-tester-qa-seller-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-tester-qa-seller-20260101/1600/400"),
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
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 0, averageRating: 0 },
    capabilities: ["host_preorders", "verified_seller", "create_coupons"] as StoreCapability[],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
