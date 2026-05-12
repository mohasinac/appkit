/**
 * Bundles data layer.
 *
 * Bundles is a consumer-facing label for `groupedListings`. This file is a
 * thin re-export so consumer pages/sections can import from a feature folder
 * that matches their domain language (FeaturedBundlesSection, etc.) without
 * duplicating the underlying query layer.
 */
export {
  getGroupedListingForDetail as getBundleForDetail,
  getGroupedListingWithItems as getBundleWithItems,
  listGroupedListings as listBundles,
  listFeaturedGroupedListings as listFeaturedBundles,
  listSitemapGroupedListings as listSitemapBundles,
  type GroupedListingWithItems as BundleWithItems,
  type ListGroupedListingsParams as ListBundlesParams,
  type SitemapGroupedListing as SitemapBundle,
} from "../grouped/data";
