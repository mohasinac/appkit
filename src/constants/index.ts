/**
 * @mohasinac/appkit/constants
 *
 * Canonical application constants: API endpoint paths, cache invalidation maps,
 * and endpoint resolution helpers.
 *
 * Import via sub-path:
 *   import { API_ENDPOINTS } from "@mohasinac/appkit/constants";
 *   import { COLLECTION_CACHE_PATHS } from "@mohasinac/appkit/constants";
 *   import { resolveEndpoint } from "@mohasinac/appkit/constants";
 */

export {
  API_ENDPOINTS,
  LOGS_ENDPOINTS,
  AUTH_ENDPOINTS,
  ACCOUNT_ENDPOINTS,
  NOTIFICATIONS_ENDPOINTS,
  SITE_SETTINGS_ENDPOINTS,
  ADMIN_ENDPOINTS,
  CHAT_ENDPOINTS,
  AUCTION_ENDPOINTS,
  BID_ENDPOINTS,
  CART_ENDPOINTS,
  CATEGORY_ENDPOINTS,
  CHECKOUT_ENDPOINTS,
  PAYMENT_ENDPOINTS,
  COLLECTION_ENDPOINTS,
  CONSULTATION_ENDPOINTS,
  COPILOT_ENDPOINTS,
  CORPORATE_ENDPOINTS,
  EVENT_ENDPOINTS,
  FAQ_ENDPOINTS,
  HOMEPAGE_ENDPOINTS,
  LOYALTY_ENDPOINTS,
  MEDIA_ENDPOINTS,
  ORDER_ENDPOINTS,
  PREORDER_ENDPOINTS,
  PRODUCT_ENDPOINTS,
  PROMOTION_ENDPOINTS,
  REVIEW_ENDPOINTS,
  SEARCH_ENDPOINTS,
  SELLER_ENDPOINTS,
  BLOG_ENDPOINTS,
  STORE_ENDPOINTS,
  WISHLIST_ENDPOINTS,
  PROFILE_STATS_ENDPOINTS,
  DEMO_ENDPOINTS,
} from "./api-endpoints";

export { COLLECTION_CACHE_PATHS } from "./cache-invalidation";

export { resolveEndpoint, resolveEndpointFn } from "./api-endpoint-resolver";

export { ROUTES, PUBLIC_ROUTES, PROTECTED_ROUTES, AUTH_ROUTES } from "../next/routing/route-map";
