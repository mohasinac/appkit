/**
 * Bundles is a consumer-facing label for the `groupedListings` collection.
 * No separate collection exists; all limits/page-sizes flow through the
 * grouped-listings shared config.
 */
export {
  GROUPED_LISTINGS_PAGE_SIZE as BUNDLES_PAGE_SIZE,
  GROUPED_LISTINGS_FEATURED_LIMIT as BUNDLES_FEATURED_LIMIT,
  GROUPED_LISTINGS_SITEMAP_LIMIT as BUNDLES_SITEMAP_LIMIT,
} from "../grouped/config";
