/**
 * Cache Invalidation Paths — @mohasinac/appkit
 *
 * Canonical mapping from Firestore collection names to the API path prefixes
 * they populate. Used by the cache revalidation endpoint and any consumer that
 * needs to invalidate specific API cache entries after writes.
 *
 * Consumers can import `COLLECTION_CACHE_PATHS` directly and pass it to the
 * cache revalidation route, or extend it with additional entries.
 */

import {
  ADMIN_ENDPOINTS,
  BLOG_ENDPOINTS,
  CART_ENDPOINTS,
  CATEGORY_ENDPOINTS,
  EVENT_ENDPOINTS,
  FAQ_ENDPOINTS,
  HOMEPAGE_ENDPOINTS,
  ORDER_ENDPOINTS,
  PRODUCT_ENDPOINTS,
  PROMOTION_ENDPOINTS,
  REVIEW_ENDPOINTS,
  SITE_SETTINGS_ENDPOINTS,
} from "./api-endpoints";

/**
 * Maps seed-script / Firestore collection names → the API path prefixes that
 * serve data from those collections. The cache revalidation endpoint uses this
 * to evict stale `CacheManager` entries after a write.
 *
 * Extend via `{ ...COLLECTION_CACHE_PATHS, myCollection: ["/api/my-collection"] }`.
 */
export const COLLECTION_CACHE_PATHS: Readonly<Record<string, string[]>> = {
  categories: [CATEGORY_ENDPOINTS.LIST],
  products: [PRODUCT_ENDPOINTS.LIST],
  carouselSlides: [HOMEPAGE_ENDPOINTS.CAROUSEL],
  homepageSections: [HOMEPAGE_ENDPOINTS.SECTIONS],
  siteSettings: [SITE_SETTINGS_ENDPOINTS.GET],
  faqs: [FAQ_ENDPOINTS.LIST],
  reviews: [REVIEW_ENDPOINTS.LIST],
  blogPosts: [ADMIN_ENDPOINTS.BLOG, BLOG_ENDPOINTS.LIST],
  events: [ADMIN_ENDPOINTS.EVENTS, EVENT_ENDPOINTS.LIST],
  coupons: [ADMIN_ENDPOINTS.COUPONS],
  cart: [CART_ENDPOINTS.GET],
  orders: [ORDER_ENDPOINTS.LIST],
  promotions: [PROMOTION_ENDPOINTS.LIST],
} as const;
