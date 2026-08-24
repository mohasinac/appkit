// `getHomepageInitial` / `getHomepageSections` / `getHeroCarouselSlides` lived
// in ./data and were deleted 2026-08-24. All three had ZERO call sites — the
// live homepage is `MarketplaceHomepageView`, which reads its repositories
// directly — and the only part worth keeping, the feature-flag gate, moved to
// `_internal/shared/features/homepage/section-gate.ts` and is now actually
// applied. The rest was a Rule #6 liability: `findActiveAuctions()` /
// `findActivePreOrders()` were unbounded `.get()` collection scans.
export {
  HOMEPAGE_FEATURED_REVIEWS_LIMIT,
  HOMEPAGE_RECENT_BLOG_POSTS_LIMIT,
  HOMEPAGE_MAX_SECTIONS,
} from "../../../shared/features/homepage/config";
