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

// Server-only RSC views — removed from index.ts to prevent firebase-admin
// leaking into the client bundle via client-entry.ts's export * from "./index".
// These are async React Server Components that fetch data via repositories.
export { PolicyPageView } from "./features/about/index";
export { BlogIndexPageView } from "./features/blog/components/BlogIndexPageView";
export { CategoriesIndexPageView } from "./features/categories/components/CategoriesIndexPageView";
export { CategoryDetailPageView } from "./features/categories/components/CategoryDetailPageView";
export { BrandDetailPageView } from "./features/categories/components/BrandDetailPageView";
export { EventsListPageView } from "./features/events/components/EventsListPageView";
export { MarketplaceHomepageView } from "./features/homepage/index";
export { PreOrdersListView } from "./features/pre-orders/index";
export { PreOrderDetailPageView } from "./features/pre-orders/index";
export { AuctionDetailPageView } from "./features/auctions/index";
export { AuctionsListView } from "./features/auctions/components/AuctionsListView";
export { BundlesListView } from "./features/categories/components/BundlesListView";
export { PrizeDrawsListingView } from "./features/products/components/PrizeDrawsListingView";
export { PrizeDrawDetailPageView } from "./features/products/components/PrizeDrawDetailPageView";
export { ProductDetailPageView } from "./features/products/components/ProductDetailPageView";
export { ProductsIndexPageView } from "./features/products/components/ProductsIndexPageView";
export { ReviewsIndexPageView } from "./features/reviews/components/ReviewsIndexPageView";
export { ReviewDetailPageView } from "./features/reviews/components/ReviewDetailPageView";
export { StoresIndexPageView } from "./features/stores/components/StoresIndexPageView";
export { StoreDetailLayoutView } from "./features/stores/components/StoreDetailLayoutView";
export { StoreProductsPageView } from "./features/stores/components/StoreProductsPageView";
export { StoreAuctionsPageView } from "./features/stores/components/StoreAuctionsPageView";
export { StorePreOrdersPageView } from "./features/stores/components/StorePreOrdersPageView";
export { StorePrizeDrawsPageView } from "./features/stores/components/StorePrizeDrawsPageView";
export { StoreBundlesPageView } from "./features/stores/components/StoreBundlesPageView";

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
  getBrandCategoryForDetail,
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

// S3: grouped listings data layer
export {
  getGroupedListingForDetail,
  getGroupedListingWithItems,
  listGroupedListings,
  listFeaturedGroupedListings,
  listSitemapGroupedListings,
  GROUPED_LISTINGS_PAGE_SIZE,
  GROUPED_LISTINGS_FEATURED_LIMIT,
  GROUPED_LISTINGS_SITEMAP_LIMIT,
  type GroupedListingWithItems,
  type ListGroupedListingsParams,
  type SitemapGroupedListing,
} from "./_internal/server/features/grouped/index";

// SB-UNI-V — bundles data layer deleted; consumers should query
// `categoriesRepository.findBySlugAndType(slug, "bundle")` /
// `.listByType("bundle", opts)` / `.findById(id)` directly.

// S4: checkout actions
export {
  createCheckoutOrderAction,
  attachPaymentAction,
  verifyAndPlaceRazorpayOrderAction,
  formatShippingAddress,
  CHECKOUT_DEFAULT_COMMISSIONS,
  CHECKOUT_PAYMENT_METHODS,
  type CreateCheckoutOrderInput,
  type VerifyAndPlaceRazorpayOrderInput,
  type CheckoutOrderResult,
  type CheckoutPaymentMethod,
} from "./_internal/server/features/checkout/index";

export { grantAdminCheckoutBypass } from "./features/checkout/server";

// S-SBUNI-RULES: refund action
export {
  processRefundAction,
  type ProcessRefundInput,
} from "./_internal/server/features/refunds/actions";

// S4: payments actions
export {
  createPaymentIntentAction,
  verifyPaymentSignatureAction,
  resolvePaymentFee,
  PAYMENTS_DEFAULT_RAZORPAY_FEE_PERCENT,
  PAYMENTS_RECEIPT_PREFIX,
  type CreatePaymentIntentInput,
  type CreatePaymentIntentResult,
  type VerifyPaymentSignatureInput,
  type ResolvedPaymentFee,
} from "./_internal/server/features/payments/index";

// S3: sublisting categories data layer
export { getSublistingCategoryForDetail } from "./_internal/server/features/sublisting-categories/index";

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

// S4–S5: Job handlers + Firebase binders moved to the `@mohasinac/appkit/jobs`
// subpath (2.6.0, 2026-05-12). The chain reaches `firebase-functions/v2/*`
// which is only available in the Firebase Functions runtime, not in Vercel
// Next.js lambdas. Consumers that need them (i.e. `functions/src/index.ts`)
// import directly from `@mohasinac/appkit/jobs`.

// S6: client scaffolds (server-side type-aware import; runtime is "use client")
export { AppShell, DashboardScaffold } from "./_internal/client/scaffolds/index";
export type {
  AppShellProps,
  AppShellRenderContext,
  DashboardScaffoldProps,
  DashboardScaffoldRenderContext,
} from "./_internal/client/scaffolds/index";

// CC-3: hydration helpers
export { toClient, clientInitial } from "./_internal/shared/serialization/index";

// S7 server feature shims (data + actions) — canonical _internal/ entries
export * as accountServer from "./_internal/server/features/account/index";
export * as authServer from "./_internal/server/features/auth/index";
export * as messagesServer from "./_internal/server/features/messages/index";
export * as scamsServer from "./_internal/server/features/scams/index";

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
export { renderCategoryOg, renderCategoryOgImage, type CategoryOgData } from "./_internal/server/features/categories/og";
