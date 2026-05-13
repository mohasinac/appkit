import { cache } from "react";
import {
  homepageSectionsRepository,
  carouselRepository,
  productRepository,
  reviewRepository,
  blogRepository,
  eventRepository,
  categoriesRepository,
} from "../../../../repositories";
import {
  HOMEPAGE_FEATURED_REVIEWS_LIMIT,
  HOMEPAGE_RECENT_BLOG_POSTS_LIMIT,
} from "../../../shared/features/homepage/config";

export const getHomepageSections = cache(async () => {
  return homepageSectionsRepository.getEnabledSections().catch(() => []);
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
  ] = await Promise.all([
    homepageSectionsRepository.getEnabledSections().catch(() => []),
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
