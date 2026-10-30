/*
 * WHY: The platform's own storefront — the one store that exists in production.
 * WHAT: Exports 1 StoreDocument partial — store-letitrip-official. The three
 * demo stores (beyblade-arena, blader-bazaar, vintage-vault-co) were removed.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
 *
 * EXPORTS:
 *   storesSeedData — array of 4 Partial<StoreDocument> for the seed runner
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

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

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
    /*
     * 🛑 The PLATFORM store carries the PLATFORM mark, not a fetched image.
     *
     * The logo is `public/logo.svg` rasterised by
     * `scripts/make-store-logo.mjs` — already in the repo, already the
     * watermark mark, and the one image in this pipeline with no licence
     * question at all. It is composited onto a fixed dark plate there because
     * `MediaAvatar` passes `objectFit="cover"` into a `rounded-full` box on a
     * surface that inverts with the theme; a transparent gradient glyph would
     * otherwise read as two different logos in light and dark.
     *
     * 🛑 There is deliberately NO `storeBannerURL`, and the field is OMITTED
     * rather than set to "".
     *
     * It used to point at `/media/store-banner-letitrip-official`, a CC0
     * "dark concrete wall texture" chosen by the editorial-image manifest.
     * What it actually resolved to is a FLAT MAROON RECTANGLE with a faint
     * stock-library watermark near the middle — 7 KB of solid colour. Rendered
     * at `h-40 md:h-56` it was the first and largest thing on every storefront,
     * and it said nothing about the shop.
     *
     * Both renderers already gate on this field being present (`StoreHeader`,
     * `InteractiveStoreCard`), so leaving it unset is the whole fix: the
     * storefront opens on the logo and the store name, and a banner reappears
     * the moment a real one is uploaded through /store/settings. That is the
     * config this replaced a placeholder with — an image or nothing, never a
     * stand-in.
     *
     * The media asset itself is left in `media-assets-editorial-seed-data.ts`
     * and in Storage. Removing the row would orphan the object (CLAUDE.md
     * § "Wiring a new seed collection"), and nothing is served by deleting a
     * file no document references.
     */
    storeLogoURL: "/media/store-logo-letitrip-official",
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
    /*
     * The platform's own store is trusted by default, and PINNED.
     *
     * 🛑 `tierLockedByAdmin` is the load-bearing part. `sellerStandingRollup`
     * measures 25 delivered orders, 25 distinct buyers, 25 distinct addresses
     * and 25 ratings inside a rolling 90 days — figures the platform store has
     * never had on a seeded catalogue — so without the pin the first month-end
     * run would strip the badge from LetItRip's own storefront and revert its
     * payout timing, with a perfectly correct audit row explaining why.
     *
     * `trustedSeller: true` is the private half: this store is paid at
     * shipping. That is trivially safe here — the counterparty is the platform
     * itself, so there is no risk being transferred to anyone.
     *
     * No `standing` is seeded at all. A seeded metrics block would be a
     * fabricated measurement, and the next real run overwrites it anyway;
     * absent means "never measured", which the seller panel renders honestly
     * instead of as a confident zero (Root Cause #72). The pin is a top-level
     * field for exactly this reason — pinning a store must not require
     * inventing figures.
     */
    sellerTier: "trusted",
    trustedSeller: true,
    tierLockedByAdmin: true,
    /*
     * The platform's own store subscribes by default — it is the one shop
     * LetItRip does not have to sell the add-on to, and leaving it off would
     * mean the only seeded storefront never demonstrates the feature it ships.
     * Every other store starts unsubscribed; the gate fails closed on absence.
     */
    whatsappNotifySubscribed: true,

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

  /*
   * 🛑 RE-POPULATED 2026-10-30 as EXPLICIT TEST DATA, with the owner's
   * confirmation for this audit sweep — a genuine second seller/store beside
   * the platform's own, for exercising the "normal seller" identity through
   * /store/*. Restored verbatim from the pre-2026-10-21-prune fixture
   * (`git show bc7357db^:src/seed/stores-seed-data.ts`), including the two
   * status-variant stores (pending/suspended) so the admin status chips and
   * seller-approval queue are not empty either.
   */
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
    capabilities: ["host_auctions", "host_preorders", "verified_seller", "create_coupons", "suggest_brands"] as StoreCapability[],
    createdAt: daysAgo(150),
    updatedAt: daysAgo(4),
  },
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
    isPublic: false,
    isVacationMode: false,
    isVerified: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 0, averageRating: 0 },
    capabilities: ["suggest_brands", "create_coupons"] as StoreCapability[],
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
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
  },
];

/**
 * Tokens derived here, not per record — see _helpers/search-txt-wrappers.ts for
 * why the wrapper form is what makes omission impossible.
 */
export const storesSeedData: Partial<StoreDocument>[] =
  _rawstoresSeedData.map(withStoreSearchTxt);
