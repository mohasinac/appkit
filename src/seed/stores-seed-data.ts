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
     * The banner is CC0, for the same reason as the carousel backgrounds: it
     * is a wide strip with the store name over it and nowhere to print credit.
     */
    storeLogoURL: "/media/store-logo-letitrip-official",
    storeBannerURL: "/media/store-banner-letitrip-official",
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
    ] as StoreCapability[],
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },];

/**
 * Tokens derived here, not per record — see _helpers/search-txt-wrappers.ts for
 * why the wrapper form is what makes omission impossible.
 */
export const storesSeedData: Partial<StoreDocument>[] =
  _rawstoresSeedData.map(withStoreSearchTxt);
