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
  API_ROUTES,
  LOGS_ENDPOINTS,
  AUTH_ENDPOINTS,
  ACCOUNT_ENDPOINTS,
  NOTIFICATIONS_ENDPOINTS,
  SITE_SETTINGS_ENDPOINTS,
  ADMIN_ENDPOINTS,
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
  ANALYTICS_ENDPOINTS,
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
} from "./api-endpoints";

export { COLLECTION_CACHE_PATHS } from "./cache-invalidation";

export {
  PAGE_SIZES,
  MAX_PAGE_SIZE,
  FEATURED_LIMITS,
  SITEMAP_LIMITS,
} from "./pagination-presets";
export type { PageSizeKey } from "./pagination-presets";

export {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_TABS,
} from "./notification-types";
export type { NotificationType } from "./notification-types";

export { resolveEndpoint, resolveEndpointFn } from "./api-endpoint-resolver";

export { ROUTES, PUBLIC_ROUTES, PROTECTED_ROUTES, AUTH_ROUTES } from "../next/routing/route-map";

export {
  WISHLIST_MAX,
  HISTORY_MAX,
  CART_MAX_ITEMS,
  WISHLIST_DOC_ID,
  HISTORY_DOC_ID,
  WISHLIST_COLLECTION,
  HISTORY_COLLECTION,
} from "./limits";

// Firestore field-name maps — pure constants, no imports. Exposed here (not
// just via "@mohasinac/appkit/client") because several consumers build
// derived objects (e.g. Object.values(...) for a Zod enum) at module-eval
// time, which needs a small, synchronously-resolvable subpath rather than
// the much larger client.ts barrel.
export {
  PRODUCT_FIELDS,
  PRODUCT_STATUS_TRANSITIONS,
  ORDER_FIELDS,
  REVIEW_FIELDS,
  BID_FIELDS,
  AD_FIELDS,
  EVENT_FIELDS,
  EVENT_ENTRY_FIELDS,
  PAYOUT_FIELDS,
  STORE_FIELDS,
  CATEGORY_FIELDS,
  BLOG_FIELDS,
  USER_FIELDS,
  ADDRESS_FIELDS,
  BRAND_FIELDS,
  CART_FIELDS,
  WISHLIST_FIELDS,
  HISTORY_FIELDS,
  NOTIFICATION_FIELDS,
  SESSION_FIELDS,
  COUPON_USAGE_FIELDS,
  SCAMMER_FIELDS,
  SUPPORT_TICKET_FIELDS,
  CAROUSEL_FIELDS,
  COUPON_FIELDS,
  FAQ_FIELDS,
  HOMEPAGE_SECTION_FIELDS,
  SITE_SETTINGS_FIELDS,
  COMMON_FIELDS,
  OAUTH_STATE_VALUES,
  SCHEMA_DEFAULTS,
} from "./field-names";

// Dashboard filter-tab sets — same rationale as the field-name maps above.
export {
  SELLER_LISTING_TABS,
  type SellerListingTabId,
} from "../features/products/constants/listing-tabs";
export {
  ALL_TAB,
  EMPTY_TAB,
  ADMIN_PRODUCT_STATUS_TABS,
  ADMIN_PRODUCT_LISTING_TYPE_TABS,
  ADMIN_BLOG_STATUS_TABS,
  ADMIN_USER_STATUS_TABS,
  ADMIN_USER_ROLE_TABS,
  ADMIN_STORE_STATUS_TABS,
  ADMIN_PAYOUT_STATUS_TABS,
  ADMIN_ORDER_STATUS_TABS,
  ADMIN_REVIEW_STATUS_TABS,
  ADMIN_REVIEW_RATING_TABS,
  ADMIN_BID_STATUS_TABS,
  ADMIN_CONTACT_STATUS_TABS,
  ADMIN_NEWSLETTER_STATUS_TABS,
  ADMIN_EVENT_ENTRY_STATUS_TABS,
  ADMIN_EVENT_STATUS_TABS,
  ADMIN_CART_OWNERSHIP_TABS,
  ADMIN_COUPON_TYPE_TABS,
  SELLER_PRODUCT_STATUS_TABS,
  SELLER_AUCTION_STATUS_TABS,
  SELLER_ORDER_STATUS_TABS,
  SELLER_OFFER_STATUS_TABS,
  SELLER_BID_STATUS_TABS,
} from "../features/admin/constants/filter-tabs";
