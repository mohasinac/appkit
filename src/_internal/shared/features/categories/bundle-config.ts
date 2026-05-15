/**
 * Bundle config — SB-UNI-V.
 *
 * Constants that used to live in `_internal/shared/features/bundles/config.ts`
 * before bundles were folded into the categories collection as
 * `categoryType:"bundle"` rows.
 */

/** Minimum products allowed in a bundle's `bundleQueryRule`. */
export const BUNDLE_MIN_ITEMS = 3 as const;
/** Maximum products allowed in a bundle's `bundleQueryRule`. */
export const BUNDLE_MAX_ITEMS = 16 as const;
/** Default per-user purchase cap when the bundle category doesn't override. */
export const BUNDLE_MAX_PER_USER_DEFAULT = 3 as const;
/** Page size for `/api/categories?categoryType=bundle` listing. */
export const BUNDLES_PAGE_SIZE = 24 as const;
/** Cap on homepage featured-bundles strip. */
export const BUNDLES_FEATURED_LIMIT = 12 as const;

// ── Bundle eligibility ───────────────────────────────────────────────────────

/**
 * Listing types that may be added to a bundle.
 *   - standard — regular product
 *   - pre-order — pre-order product
 *   - prize-draw — added as N draws/entries (see BundleItemDetail.drawCount)
 *
 * Auctions and bundles themselves are never eligible.
 */
export const BUNDLE_ELIGIBLE_LISTING_TYPES = [
  "standard",
  "pre-order",
  "prize-draw",
] as const;

export type BundleEligibleListingType =
  (typeof BUNDLE_ELIGIBLE_LISTING_TYPES)[number];

// ── Bundle kinds ─────────────────────────────────────────────────────────────

/**
 * "special" — explicitly curated admin bundle. Only special bundles write
 * reverse `partOfBundleIds` pointers on member products and are displayed in
 * the "Bundled" badge on product cards / detail pages.
 *
 * "brand" — auto-generated collection driven by a dynamic brand query rule.
 * Does NOT update `partOfBundleIds` on products; treated as a discovery
 * surface, not a priced product grouping.
 */
export const BUNDLE_KIND_SPECIAL = "special" as const;
export const BUNDLE_KIND_BRAND = "brand" as const;
export type BundleKind = typeof BUNDLE_KIND_SPECIAL | typeof BUNDLE_KIND_BRAND;

/** Max draw entries a prize-draw item contributes when added to a bundle. */
export const BUNDLE_DRAW_COUNT_MAX = 500 as const;
