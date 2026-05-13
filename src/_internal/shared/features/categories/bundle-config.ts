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
