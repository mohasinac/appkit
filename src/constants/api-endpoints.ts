/**
 * API Endpoints — @mohasinac/appkit
 *
 * Canonical endpoint constants used throughout appkit hooks and client utilities.
 * Hooks consume these defaults; consumers override via endpoint options on each hook.
 *
 * Never hard-code `/api/...` strings in hook files — import from here.
 */

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export const LOGS_ENDPOINTS = {
  WRITE: "/api/logs/write",
} as const;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const AUTH_ENDPOINTS = {
  ME: "/api/auth/me",
  LOGIN: "/api/auth/login",
  REGISTER: "/api/auth/register",
  LOGOUT: "/api/auth/logout",
  GOOGLE_START: "/api/auth/google/start",
  SESSION: "/api/auth/session",
  SESSION_ACTIVITY: "/api/auth/session/activity",
  SESSION_VALIDATE: "/api/auth/session/validate",
  EVENT_INIT: "/api/auth/event/init",
  RESEND_VERIFICATION: "/api/auth/resend-verification",
} as const;

// ---------------------------------------------------------------------------
// User / Account
// ---------------------------------------------------------------------------

export const ACCOUNT_ENDPOINTS = {
  /** @param userId — Firestore user document id */
  BY_ID: (userId: string) => `/api/account/${userId}`,
  PROFILE: "/api/user/profile",
  CHANGE_PASSWORD: "/api/user/change-password",
  /** @param userId — for public profile pages */
  PUBLIC_PROFILE: (userId: string) => `/api/profile/${userId}`,
  /** @param userId — seller profile page */
  SELLER_PROFILE: (sellerId: string) => `/api/profile/${sellerId}`,
  /** @param userId — seller public reviews */
  SELLER_REVIEWS: (sellerId: string) => `/api/profile/${sellerId}/reviews`,
  ADDRESSES: "/api/user/addresses",
  ADDRESS_BY_ID: (id: string) => `/api/user/addresses/${id}`,
  ADDRESS_SET_DEFAULT: (id: string) => `/api/user/addresses/${id}/set-default`,
  ORDERS: "/api/user/orders",
  ORDER_BY_ID: (orderId: string) => `/api/user/orders/${orderId}`,
  WISHLIST: "/api/user/wishlist",
  HISTORY: "/api/user/history",
  HISTORY_ITEM: (productId: string) =>
    `/api/user/history/${encodeURIComponent(productId)}`,
  HISTORY_MERGE: "/api/user/history/merge",
} as const;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NOTIFICATIONS_ENDPOINTS = {
  LIST: "/api/notifications",
  READ_ALL: "/api/notifications/read-all",
  BY_ID: (id: string) => `/api/notifications/${id}`,
} as const;

// ---------------------------------------------------------------------------
// Site Settings
// ---------------------------------------------------------------------------

export const SITE_SETTINGS_ENDPOINTS = {
  GET: "/api/site-settings",
} as const;

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const ADMIN_ENDPOINTS = {
  STATS: "/api/admin/stats",
  DASHBOARD: "/api/admin/dashboard",
  ANALYTICS: "/api/admin/analytics",
  ADS: "/api/admin/ads",
  AD_BY_ID: (id: string) => `/api/admin/ads/${id}`,
  REALTIME_TOKEN: "/api/realtime/token",
  PAYMENTS_SETTINGS: "/api/admin/payments/settings",
  PRODUCTS: "/api/admin/products",
  PRODUCT_BY_ID: (id: string) => `/api/admin/products/${id}`,
  ORDERS: "/api/admin/orders",
  ORDER_BY_ID: (id: string) => `/api/admin/orders/${id}`,
  ORDER_REFUND: (id: string) => `/api/admin/orders/${id}/refund`,
  USERS: "/api/admin/users",
  USER_BY_ID: (uid: string) => `/api/admin/users/${uid}`,
  REVIEWS: "/api/admin/reviews",
  REVIEW_BY_ID: (id: string) => `/api/admin/reviews/${id}`,
  BIDS: "/api/admin/bids",
  BID_BY_ID: (id: string) => `/api/admin/bids/${id}`,
  BLOG: "/api/admin/blog",
  BLOG_BY_ID: (id: string) => `/api/admin/blog/${id}`,
  CATEGORIES: "/api/admin/categories",
  CATEGORY_BY_ID: (id: string) => `/api/admin/categories/${id}`,
  BRANDS: "/api/admin/brands",
  BRAND_BY_ID: (id: string) => `/api/admin/brands/${id}`,
  FAQS: "/api/admin/faqs",
  FAQ_BY_ID: (id: string) => `/api/admin/faqs/${id}`,
  STORES: "/api/admin/stores",
  STORE_BY_ID: (uid: string) => `/api/admin/stores/${uid}`,
  PAYOUTS: "/api/admin/payouts",
  PAYOUT_BY_ID: (id: string) => `/api/admin/payouts/${id}`,
  PAYOUTS_WEEKLY: "/api/admin/payouts/weekly",
  PAYOUTS_EXPORT: "/api/admin/payouts/export",
  EVENTS: "/api/admin/events",
  EVENT_BY_ID: (id: string) => `/api/admin/events/${id}`,
  EVENT_STATUS: (id: string) => `/api/admin/events/${id}/status`,
  EVENT_STATS: (id: string) => `/api/admin/events/${id}/stats`,
  EVENT_ENTRIES: (id: string) => `/api/admin/events/${id}/entries`,
  EVENT_ENTRY_BY_ID: (eventId: string, entryId: string) =>
    `/api/admin/events/${eventId}/entries/${entryId}`,
  COUPONS: "/api/admin/coupons",
  COUPON_BY_ID: (id: string) => `/api/admin/coupons/${id}`,
  SECTIONS: "/api/admin/sections",
  SECTION_BY_ID: (id: string) => `/api/admin/sections/${id}`,
  NEWSLETTER: "/api/admin/newsletter",
  NEWSLETTER_BY_ID: (id: string) => `/api/admin/newsletter/${id}`,
  CONTACT_SUBMISSIONS: "/api/admin/contact-submissions",
  CONTACT_SUBMISSION_BY_ID: (id: string) => `/api/admin/contact-submissions/${id}`,
  SESSIONS: "/api/admin/sessions",
  SESSION_BY_ID: (id: string) => `/api/admin/sessions/${id}`,
  SESSIONS_REVOKE_USER: "/api/admin/sessions/revoke-user",
  ADMIN_EVENT_ENTRIES: "/api/admin/event-entries",
  ADMIN_EVENT_ENTRY_BY_ID: (id: string) => `/api/admin/event-entries/${id}`,
  ADMIN_NOTIFICATIONS: "/api/admin/notifications",
  ADMIN_NOTIFICATION_BY_ID: (id: string) => `/api/admin/notifications/${id}`,
  ADMIN_NOTIFICATION_RESEND: (id: string) => `/api/admin/notifications/${id}/resend`,
  ADMIN_CARTS: "/api/admin/carts",
  ADMIN_WISHLISTS: "/api/admin/wishlists",
  ADMIN_HISTORY: "/api/admin/history",
  NEWSLETTER_EXPORT: "/api/admin/newsletter/export",
  FEATURE_FLAGS: "/api/admin/feature-flags",
  STORE_ADDRESSES: "/api/admin/store-addresses",
  CAROUSEL: "/api/admin/carousel",
  CAROUSEL_BY_ID: (id: string) => `/api/admin/carousel/${id}`,
  CAROUSEL_REORDER: "/api/admin/carousel/reorder",
  NAVIGATION: "/api/admin/navigation",
  NAVIGATION_BY_ID: (id: string) => `/api/admin/navigation/${id}`,
  ADMIN_SITE: "/api/admin/site",
  SUBLISTING_CATEGORIES: "/api/admin/sublisting-categories",
  SUBLISTING_CATEGORY_BY_ID: (id: string) => `/api/admin/sublisting-categories/${id}`,
  PRODUCT_FEATURES: "/api/admin/features",
  PRODUCT_FEATURE_BY_ID: (id: string) => `/api/admin/features/${id}`,
} as const;

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const CHAT_ENDPOINTS = {
  LIST: "/api/chat",
  BY_ID: (chatId: string) => `/api/chat/${chatId}`,
  MESSAGES: (chatId: string) => `/api/chat/${chatId}/messages`,
} as const;

// ---------------------------------------------------------------------------
// Auctions
// ---------------------------------------------------------------------------

export const AUCTION_ENDPOINTS = {
  LIST: "/api/auctions",
  BY_SLUG: (slug: string) => `/api/auctions/${slug}`,
  BIDS: (slug: string) => `/api/auctions/${slug}/bids`,
} as const;

// ---------------------------------------------------------------------------
// Bids
// ---------------------------------------------------------------------------

export const BID_ENDPOINTS = {
  LIST: "/api/bids",
  BY_PRODUCT: (productId: string) => `/api/bids?productId=${productId}`,
  REALTIME: (productId: string) => `/api/realtime/bids/${productId}`,
} as const;

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export const CART_ENDPOINTS = {
  GET: "/api/cart",
  BY_USER: (userId: string) => `/api/cart?userId=${userId}`,
  MERGE: "/api/cart/merge",
} as const;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORY_ENDPOINTS = {
  LIST: "/api/categories",
  FLAT: "/api/categories?flat=true",
  BY_SLUG: (slug: string) => `/api/categories?slug=${slug}`,
  BY_PARENT: (parentId: string) => `/api/categories?parentId=${parentId}`,
  BRANDS: (pageSize = 100) =>
    `/api/categories?isBrand=true&pageSize=${pageSize}`,
  ROOT: (pageSize = 20) => `/api/categories?tier=0&pageSize=${pageSize}`,
} as const;

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export const CHECKOUT_ENDPOINTS = {
  PREFLIGHT: "/api/checkout/preflight",
  PLACE_ORDER: "/api/checkout",
} as const;

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export const PAYMENT_ENDPOINTS = {
  CREATE_ORDER: "/api/payment/create-order",
  VERIFY: "/api/payment/verify",
} as const;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export const COLLECTION_ENDPOINTS = {
  LIST: "/api/collections",
  BY_SLUG: (slug: string) => `/api/collections/${slug}`,
} as const;

// ---------------------------------------------------------------------------
// Consultation
// ---------------------------------------------------------------------------

export const CONSULTATION_ENDPOINTS = {
  LIST: "/api/consultations",
} as const;

// ---------------------------------------------------------------------------
// Copilot
// ---------------------------------------------------------------------------

export const COPILOT_ENDPOINTS = {
  CHAT: "/api/copilot/chat",
} as const;

// ---------------------------------------------------------------------------
// Corporate
// ---------------------------------------------------------------------------

export const CORPORATE_ENDPOINTS = {
  INQUIRIES: "/api/corporate-inquiries",
} as const;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const EVENT_ENDPOINTS = {
  LIST: "/api/events",
  BY_ID: (id: string) => `/api/events/${id}`,
  ENTRIES: (id: string) => `/api/events/${id}/entries`,
  LEADERBOARD: (id: string, limit?: number) =>
    `/api/events/${id}/leaderboard${limit !== undefined ? `?limit=${limit}` : ""}`,
} as const;

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export const FAQ_ENDPOINTS = {
  LIST: "/api/faqs",
  BY_ID: (id: string) => `/api/faqs/${id}`,
  VOTE: "/api/faqs/vote",
} as const;

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------

export const HOMEPAGE_ENDPOINTS = {
  GET: "/api/homepage",
  SECTIONS: "/api/homepage-sections",
  CAROUSEL: "/api/carousel",
  NEWSLETTER_SUBSCRIBE: "/api/newsletter/subscribe",
} as const;

// ---------------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------------

export const LOYALTY_ENDPOINTS = {
  BALANCE: (uid: string) => `/api/loyalty/balance?uid=${uid}`,
} as const;

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const MEDIA_ENDPOINTS = {
  BASE: "/api/media",
  SIGN: "/api/media/sign",
  FINALIZE: "/api/media/finalize",
  CROP: "/api/media/crop",
  TRIM: "/api/media/trim",
  DELETE: (url: string) => `/api/media?url=${encodeURIComponent(url)}`,
} as const;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const ORDER_ENDPOINTS = {
  LIST: "/api/orders",
  BY_ID: (id: string) => `/api/orders/${id}`,
  TRACK: (trackingId: string) => `/api/orders/track/${trackingId}`,
} as const;

// ---------------------------------------------------------------------------
// Pre-orders
// ---------------------------------------------------------------------------

export const PREORDER_ENDPOINTS = {
  LIST: "/api/preorders",
  BY_SLUG: (slug: string) => `/api/preorders/${slug}`,
} as const;

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const PRODUCT_ENDPOINTS = {
  LIST: "/api/products",
  BY_SLUG: (slug: string) => `/api/products/${slug}`,
  BY_ID: (id: string) => `/api/products/${id}`,
} as const;

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export const PROMOTION_ENDPOINTS = {
  LIST: "/api/coupons",
  COUPON_BY_CODE: (code: string) => `/api/coupons/${code}`,
  COUPON_VALIDATE: "/api/coupons/validate",
} as const;

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const REVIEW_ENDPOINTS = {
  LIST: "/api/reviews",
  FEATURED: "/api/reviews?featured=true",
} as const;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const SEARCH_ENDPOINTS = {
  QUERY: (q: string, extra?: string) =>
    `/api/search?q=${encodeURIComponent(q)}${extra ? `&${extra}` : ""}`,
} as const;

// ---------------------------------------------------------------------------
// Seller
// ---------------------------------------------------------------------------

export const SELLER_ENDPOINTS = {
  BECOME: "/api/seller/become",
  PRODUCTS: "/api/store/products",
  ORDERS: "/api/store/orders",
  ORDERS_BY_ID: (orderId: string) => `/api/store/orders/${orderId}`,
  AUCTIONS: "/api/store/products",
  COUPONS: "/api/store/coupons",
  COUPON_BY_ID: (id: string) => `/api/store/coupons/${id}`,
  OFFERS: "/api/store/offers",
  PAYOUTS: "/api/store/payouts",
  PAYOUT_SETTINGS: "/api/store/payout-settings",
  STORE: "/api/store/storefront",
  STORE_ADDRESSES: "/api/store/addresses",
  STORE_ADDRESS_BY_ID: (id: string) => `/api/store/addresses/${id}`,
  BIDS: "/api/store/bids",
  DASHBOARD: "/api/store/dashboard",
  ANALYTICS: (period?: string) =>
    `/api/store/analytics${period ? `?period=${period}` : ""}`,
  FEATURES: "/api/store/features",
  FEATURE_BY_ID: (id: string) => `/api/store/features/${id}`,
} as const;

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export const BLOG_ENDPOINTS = {
  LIST: "/api/blog",
  BY_SLUG: (slug: string) => `/api/blog/${slug}`,
  FEATURED: (perPage?: number) =>
    `/api/blog?featured=true${perPage !== undefined ? `&perPage=${perPage}` : ""}`,
  SORTED: (sort: string) => `/api/blog?sort=${sort}`,
} as const;

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export const STORE_ENDPOINTS = {
  LIST: "/api/stores",
  BY_SLUG: (slug: string) => `/api/stores/${slug}`,
  PRODUCTS: (slug: string) => `/api/stores/${slug}/products`,
  AUCTIONS: (slug: string) => `/api/stores/${slug}/auctions`,
  REVIEWS: (slug: string) => `/api/stores/${slug}/reviews`,
} as const;

// ---------------------------------------------------------------------------
// Wishlist (seller-side)
// ---------------------------------------------------------------------------

export const WISHLIST_ENDPOINTS = {
  LIST: "/api/user/wishlist",
  BY_USER: (userId: string) => `/api/wishlist?userId=${userId}`,
} as const;

// ---------------------------------------------------------------------------
// Profile Stats
// ---------------------------------------------------------------------------

export const PROFILE_STATS_ENDPOINTS = {
  ORDERS: "/api/user/orders",
  ADDRESSES: "/api/user/addresses",
  PRODUCTS: (sellerId: string) => `/api/products?filters=sellerId==${sellerId}`,
  REVIEWS: (userId: string) => `/api/profile/${userId}/reviews`,
} as const;

// ---------------------------------------------------------------------------
// Before / After
// ---------------------------------------------------------------------------

export const BEFORE_AFTER_ENDPOINTS = {
  LIST: "/api/before-after",
} as const;

// ---------------------------------------------------------------------------
// Demo / Seed
// ---------------------------------------------------------------------------

export const DEMO_ENDPOINTS = {
  SEED: "/api/demo/seed",
} as const;

// ---------------------------------------------------------------------------
// WhatsApp Business (store-level settings + catalog sync)
// ---------------------------------------------------------------------------

export const WHATSAPP_SELLER_ENDPOINTS = {
  SETTINGS: "/api/store/whatsapp-settings",
  CATALOG_SYNC: "/api/store/whatsapp-settings/catalog-sync",
} as const;

// ---------------------------------------------------------------------------
// Aggregate namespace export
// ---------------------------------------------------------------------------

export const API_ENDPOINTS = {
  LOGS: LOGS_ENDPOINTS,
  AUTH: AUTH_ENDPOINTS,
  ACCOUNT: ACCOUNT_ENDPOINTS,
  NOTIFICATIONS: NOTIFICATIONS_ENDPOINTS,
  SITE_SETTINGS: SITE_SETTINGS_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS,
  CHAT: CHAT_ENDPOINTS,
  AUCTIONS: AUCTION_ENDPOINTS,
  BIDS: BID_ENDPOINTS,
  CART: CART_ENDPOINTS,
  CATEGORIES: CATEGORY_ENDPOINTS,
  BEFORE_AFTER: BEFORE_AFTER_ENDPOINTS,
  CHECKOUT: CHECKOUT_ENDPOINTS,
  PAYMENT: PAYMENT_ENDPOINTS,
  COLLECTIONS: COLLECTION_ENDPOINTS,
  CONSULTATION: CONSULTATION_ENDPOINTS,
  COPILOT: COPILOT_ENDPOINTS,
  CORPORATE: CORPORATE_ENDPOINTS,
  EVENTS: EVENT_ENDPOINTS,
  FAQS: FAQ_ENDPOINTS,
  HOMEPAGE: HOMEPAGE_ENDPOINTS,
  LOYALTY: LOYALTY_ENDPOINTS,
  MEDIA: MEDIA_ENDPOINTS,
  ORDERS: ORDER_ENDPOINTS,
  PREORDERS: PREORDER_ENDPOINTS,
  PRODUCTS: PRODUCT_ENDPOINTS,
  PROMOTIONS: PROMOTION_ENDPOINTS,
  REVIEWS: REVIEW_ENDPOINTS,
  SEARCH: SEARCH_ENDPOINTS,
  SELLER: SELLER_ENDPOINTS,
  BLOG: BLOG_ENDPOINTS,
  STORES: STORE_ENDPOINTS,
  WISHLIST: WISHLIST_ENDPOINTS,
  PROFILE_STATS: PROFILE_STATS_ENDPOINTS,
  DEMO: DEMO_ENDPOINTS,
  WHATSAPP_SELLER: WHATSAPP_SELLER_ENDPOINTS,
} as const;

/** Canonical alias — prefer API_ROUTES over API_ENDPOINTS in new code. */
export const API_ROUTES = API_ENDPOINTS;
