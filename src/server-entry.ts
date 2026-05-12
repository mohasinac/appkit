/**
 * appkit server entry — resolved by react-server / Node conditionals.
 *
 * S1: thin proxy that re-exports the full index (shared + client UI refs + server).
 * index.ts is the existing 8,933-line barrel and already covers everything
 * that client.ts and server.ts export, so we only need index.ts here.
 *
 * Starting in S2, features migrate to _internal/server/** and the re-export
 * below is progressively replaced with targeted server exports.
 *
 * Consumer code: import { siteSettingsRepository, createProduct, ... } from "@mohasinac/appkit"
 * The conditional exports map routes here for react-server / Node context.
 */

// Full surface — same symbols as client entry for now.
// firebase-admin is correctly reachable here since this is the server entry.
export * from "./index";

// S2: products data layer — deduped via React.cache()
export {
  getProductForDetail,
  listSitemapProducts,
  type SitemapProduct,
} from "./_internal/server/features/products/index";

// S3: auctions data layer — deduped via React.cache()
export {
  getAuctionForDetail,
  getProductFeaturesForAuction,
} from "./_internal/server/features/auctions/index";

// S3: pre-orders data layer — deduped via React.cache()
export {
  getPreOrderForDetail,
  getProductFeaturesForPreOrder,
} from "./_internal/server/features/pre-orders/index";

// S3: brands data layer + actions
export {
  getBrandForDetail,
  createBrandAction,
  updateBrandAction,
  deleteBrandAction,
  toggleBrandActiveAction,
} from "./_internal/server/features/brands/index";

// S3: blog data layer + actions
export {
  getBlogPostForDetail,
  getBlogPostById,
  createBlogPostAction,
  updateBlogPostAction,
  deleteBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
} from "./_internal/server/features/blog/index";

// S3: events data layer + actions
export {
  getEventForDetail,
  registerForEventAction,
  cancelEventRegistrationAction,
  createEventAction,
  updateEventAction,
} from "./_internal/server/features/events/index";

// S2–S3: products full layer (data + actions)
export {
  createProductAction,
  createAuctionAction,
  createPreOrderAction,
  updateProductAction,
  deleteProductAction,
  setProductStatusAction,
  setProductFeaturedAction,
} from "./_internal/server/features/products/index";

// S3: auctions actions
export { placeBidAction as placeBidServerAction } from "./_internal/server/features/auctions/index";

// S3: pre-orders actions
export { reservePreOrderAction } from "./_internal/server/features/pre-orders/index";

// S4: cart actions
export {
  getCartForUser,
  addToCartAction,
  removeFromCartAction,
  clearCartAction,
  mergeGuestCartAction,
  CART_MAX_ITEMS,
  CART_GUEST_STORAGE_KEY,
} from "./_internal/server/features/cart/index";

// S4: orders data + actions + adapters
export {
  getOrderForDetail,
  getOrdersForBuyer,
  getRecentOrdersForBuyer,
  createOrderAction,
  cancelOrderAction,
  requestReturnAction,
  updateOrderStatusAction,
  ORDERS_PAGE_SIZE,
  orderDocumentToOrder,
} from "./_internal/server/features/orders/index";

// S4: promotions (coupons)
export {
  getCouponByCode,
  applyCouponAction,
  createCouponAction,
  updateCouponAction,
  deactivateCouponAction,
} from "./_internal/server/features/promotions/index";

// S5: wishlist data layer + actions
export {
  getWishlistForUser,
  isProductInWishlist,
  addToWishlistAction,
  removeFromWishlistAction,
  mergeGuestWishlistAction,
  WISHLIST_MAX,
  WISHLIST_GUEST_STORAGE_KEY,
  WishlistCapError,
} from "./_internal/server/features/wishlist/index";

// S5: history data layer + actions
export {
  getHistoryForUser,
  trackProductViewAction,
  mergeGuestHistoryAction,
  HISTORY_MAX,
  HISTORY_GUEST_STORAGE_KEY,
} from "./_internal/server/features/history/index";

// S5: homepage data layer
export {
  getHomepageInitial,
  getHomepageSections,
  getHeroCarouselSlides,
} from "./_internal/server/features/homepage/index";

// S5: reviews data layer + actions
export {
  getReviewsForProduct,
  getReviewsForStore,
  hasUserPurchasedProduct,
  createReviewAction,
  replyToReviewAction,
  deleteReviewAction,
  markReviewHelpfulAction,
} from "./_internal/server/features/reviews/index";

// S5: search data layer + action
export {
  getSearchResults,
  searchAction,
  type SearchQuery,
} from "./_internal/server/features/search/index";

// S3: categories data layer
export {
  getCategoryForDetail,
  listRootCategories,
  listFeaturedCategories,
  listMenuCategories,
  getCategoryTree,
  listSitemapCategories,
  CATEGORIES_PAGE_SIZE,
  CATEGORIES_ROOT_TIER,
  CATEGORIES_MAX_DEPTH,
  CATEGORIES_SITEMAP_LIMIT,
  CATEGORIES_FEATURED_LIMIT,
  CATEGORIES_MENU_LIMIT,
} from "./_internal/server/features/categories/index";

// S3: stores data layer
export {
  getStoreForDetail,
  listStoreProductsInitial,
  listStoreAuctionsInitial,
  listStorePreOrdersInitial,
  listSitemapStores,
  STORES_PAGE_SIZE,
  STORES_PRODUCTS_PAGE_SIZE,
  STORES_SITEMAP_LIMIT,
  STORES_FEATURED_LIMIT,
} from "./_internal/server/features/stores/index";

// Shared domain errors
export {
  AppkitError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ConflictError,
  CapacityError,
  ExpiredError,
} from "./_internal/shared/errors/index";

// New shared tokens and config types
export type { AppkitConfig } from "./_internal/shared/config/schema";
export {
  SEMANTIC_COLORS,
  SEMANTIC_COLORS_DARK,
  SEMANTIC_RADIUS,
  SEMANTIC_SHADOWS,
  SEMANTIC_Z_INDEX,
  MOTION_TOKENS,
  BREAKPOINTS,
  PLATFORM_LIMITS,
} from "./_internal/shared/tokens/index";
export type { Responsive, Breakpoint, SemanticColor } from "./_internal/shared/tokens/index";

// OG image renderers — pure JSX, no next/og dependency; wrap with ImageResponse in consumer.
// Two layers per feature:
//   - renderXOg(doc, opts)  — high-level: takes the raw doc from the data layer, does field
//                             mapping internally. Use this for ~5-line consumer shims.
//   - renderXOgImage(data, siteName)  — low-level primitive: takes a pre-mapped data shape.
//                             Use only when overriding the default field extraction.
export { renderProductOg, renderProductOgImage, type ProductOgData, type OgOptions } from "./_internal/server/features/products/og";
export { renderAuctionOg, renderAuctionOgImage, type AuctionOgData } from "./_internal/server/features/auctions/og";
export { renderPreOrderOg, renderPreOrderOgImage, type PreOrderOgData } from "./_internal/server/features/pre-orders/og";
export { renderStoreOg, renderStoreOgImage, type StoreOgData } from "./_internal/server/features/stores/og";
export { renderBrandOg, renderBrandOgImage, type BrandOgData } from "./_internal/server/features/brands/og";
export { renderBlogOg, renderBlogOgImage, type BlogOgData } from "./_internal/server/features/blog/og";
export { renderEventOg, renderEventOgImage, type EventOgData } from "./_internal/server/features/events/og";
export { renderSublistingCategoryOg, renderSublistingCategoryOgImage, type SublistingCategoryOgData } from "./_internal/server/features/sublisting-categories/og";
export { renderProfileOg, renderPrivateProfileOgImage, renderUserProfileOgImage, type UserProfileOgData } from "./_internal/server/features/profile/og";
