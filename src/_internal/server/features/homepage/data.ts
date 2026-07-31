import { cache } from "react";
import {
  homepageSectionsRepository,
  carouselRepository,
  productRepository,
  reviewRepository,
  blogRepository,
  eventRepository,
  categoriesRepository,
  siteSettingsRepository,
} from "../../../../repositories";
import {
  HOMEPAGE_FEATURED_REVIEWS_LIMIT,
  HOMEPAGE_RECENT_BLOG_POSTS_LIMIT,
} from "../../../shared/features/homepage/config";
import type { SectionType } from "../../../../features/homepage/schemas/firestore";
import type { FeatureFlagKey } from "../../../../features/admin/schemas/firestore";

/** Section types that require a feature flag to be enabled to show on the homepage. */
const SECTION_FEATURE_GATE: Partial<Record<SectionType, FeatureFlagKey>> = {
  auctions: "auctions",
  "pre-orders": "preOrders",
  events: "events",
  "event-raffles": "events",
  "prize-draws": "events",
  "blog-articles": "blog",
};

export const getHomepageSections = cache(async () => {
  const [sections, settings] = await Promise.all([
    homepageSectionsRepository.getEnabledSections().catch(() => []),
    siteSettingsRepository.getSingleton().catch(() => null),
  ]);
  const flags = settings?.featureFlags;
  if (!flags) return sections;
  return sections.filter((s) => {
    const flagKey = SECTION_FEATURE_GATE[s.type as SectionType];
    if (!flagKey) return true;
    return flags[flagKey] !== false;
  });
});

export const getHeroCarouselSlides = cache(async () => {
  return carouselRepository.getActiveSlides().catch(() => []);
});

/**
 * One parallel fetch returning every piece of data the homepage sections need.
 * Page components call this once; React.cache() deduplicates per request.
 */
export const getHomepageInitial = cache(async () => {
  const [
    rawSections,
    settings,
    carouselSlides,
    featuredProducts,
    activeAuctions,
    activePreOrders,
    activeBrands,
    featuredReviews,
    recentBlogPosts,
    activeEvents,
    featuredCategories,
  ] = await Promise.all([
    homepageSectionsRepository.getEnabledSections().catch(() => []),
    siteSettingsRepository.getSingleton().catch(() => null),
    carouselRepository.getActiveSlides().catch(() => []),
    productRepository.findFeatured().catch(() => []),
    productRepository.findActiveAuctions().catch(() => []),
    productRepository.findActivePreOrders().catch(() => []),
    categoriesRepository.findActiveBrands().catch(() => []),
    reviewRepository.findFeatured(HOMEPAGE_FEATURED_REVIEWS_LIMIT).catch(() => []),
    blogRepository.listPublished({}, { page: 1, pageSize: HOMEPAGE_RECENT_BLOG_POSTS_LIMIT, sorts: "-publishedAt" }).then((r) => r.items ?? []).catch(() => []),
    eventRepository.listActive().catch(() => []),
    categoriesRepository.getFeaturedCategories().catch(() => []),
  ]);

  const flags = settings?.featureFlags;
  const sections = flags
    ? rawSections.filter((s) => {
        const flagKey = SECTION_FEATURE_GATE[s.type as SectionType];
        if (!flagKey) return true;
        return flags[flagKey] !== false;
      })
    : rawSections;

  return {
    sections,
    carouselSlides,
    featuredProducts,
    activeAuctions,
    activePreOrders,
    activeBrands,
    featuredReviews,
    recentBlogPosts,
    activeEvents,
    featuredCategories,
  };
});
