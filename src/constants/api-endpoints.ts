/**
 * API Endpoints — @mohasinac/appkit
 *
 * Canonical endpoint constants used throughout appkit hooks and client utilities.
 * Hooks consume these defaults; consumers override via endpoint options on each hook.
 *
 * Never hard-code `/api/...` strings in hook files — import from here.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const CONFIG_ENDPOINTS = {
} as const;

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export const LOGS_ENDPOINTS = {
  WRITE: "/api/logs/write",
} as const;

// ---------------------------------------------------------------------------
// Client Error Reporting
// ---------------------------------------------------------------------------

export const CLIENT_ERROR_ENDPOINTS = {
  REPORT: "/api/client-errors",
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
  /*
   * RESEND_VERIFICATION was here and is gone. The route was deleted in the
   * Firebase-native auth migration (Root Cause #54: the Admin SDK cannot send
   * email, only generate action links), and the constant outlived it — so the
   * one hook that used it 404'd on every call. `useResendVerification` now
   * calls the client SDK directly and needs no endpoint. Do not re-add this.
   */
} as const;

// ---------------------------------------------------------------------------
// User / Account
// ---------------------------------------------------------------------------

export const ACCOUNT_ENDPOINTS = {
  /** @param userId — Firestore user document id */
  BY_ID: (userId: string) => `/api/account/${userId}`,
  PROFILE: "/api/user/profile",
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
  WISHLIST_ITEM_BY_ID: (itemId: string) =>
    `/api/user/wishlist/${encodeURIComponent(itemId)}`,
  WISHLIST_ITEM_SYNC: (itemId: string) =>
    `/api/user/wishlist/${encodeURIComponent(itemId)}/sync`,
  WISHLIST_VALIDATE: "/api/user/wishlist/validate",
  HISTORY: "/api/user/history",
  HISTORY_ITEM: (productId: string) =>
    `/api/user/history/${encodeURIComponent(productId)}`,
  HISTORY_MERGE: "/api/user/history/merge",
  REVIEWS: "/api/user/reviews",
  BIDS: "/api/user/bids",
  BID_BY_ID: (id: string) => `/api/user/bids/${id}`,
  EXPORT: "/api/user/export",
  /** Claimed-coupons wallet — GET list, POST claim, DELETE by id. */
  COUPONS: "/api/user/coupons",
  COUPON_BY_ID: (id: string) => `/api/user/coupons/${id}`,
  COUPONS_CLAIM: "/api/user/coupons/claim",
  OFFERS: "/api/user/offers",
  NOTIFICATION_PREFERENCES: "/api/user/notification-preferences",
  CATALOGUE: "/api/user/catalogue",
  CATALOGUE_BY_ID: (id: string) => `/api/user/catalogue/${id}`,
  CATALOGUE_LIST: (id: string) => `/api/user/catalogue/${id}/list`,
  CATALOGUE_SUBMIT: (id: string) => `/api/user/catalogue/${id}/submit`,
  PUBLIC_CATALOGUE: (ownerSlug: string) => `/api/catalogue/${ownerSlug}`,
  PUBLIC_CATALOGUE_ITEM: (ownerSlug: string, itemId: string) => `/api/catalogue/${ownerSlug}/${itemId}`,
  /** Tester Hub — GET active checklist items joined with the tester's own responses; PUT upserts one item's answer/comment/screenshot. */
  TESTER_CHECKLIST: "/api/user/tester-checklist",
  TESTER_CHECKLIST_ITEM_BY_ID: (checklistItemId: string) =>
    `/api/user/tester-checklist/${encodeURIComponent(checklistItemId)}`,
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
  ANALYTICS_PAGE_VIEWS: "/api/admin/analytics/pageviews",
  ADS: "/api/admin/ads",
  /** The action-index control plane (W7 / D7) — GET the whole index, PATCH one override. */
  ACTION_INDEX: "/api/admin/action-index",
  AD_BY_ID: (id: string) => `/api/admin/ads/${id}`,
  PAYMENTS_SETTINGS: "/api/admin/payments/settings",
  PRODUCTS: "/api/admin/products",
  PRODUCT_BY_ID: (id: string) => `/api/admin/products/${id}`,
  ORDERS: "/api/admin/orders",
  ORDER_BY_ID: (id: string) => `/api/admin/orders/${id}`,
  ORDER_REFUND: (id: string) => `/api/admin/orders/${id}/refund`,
  ORDER_PAYMENT_VERIFY: (id: string) => `/api/admin/orders/${id}/payment-verify`,
  ORDER_PAYMENT_REUPLOAD: (id: string) => `/api/admin/orders/${id}/payment-reupload`,
  ORDER_PAYMENT_REJECT_FRAUD: (id: string) => `/api/admin/orders/${id}/payment-reject-fraud`,
  USERS: "/api/admin/users",
  USERS_BULK: "/api/admin/users/bulk",
  USER_BY_ID: (uid: string) => `/api/admin/users/${uid}`,
  REVIEWS: "/api/admin/reviews",
  REVIEW_BY_ID: (id: string) => `/api/admin/reviews/${id}`,
  BIDS: "/api/admin/bids",
  BID_BY_ID: (id: string) => `/api/admin/bids/${id}`,
  OFFERS: "/api/admin/offers",
  OFFER_BY_ID: (id: string) => `/api/admin/offers/${id}`,
  BLOG: "/api/admin/blog",
  BLOG_BY_ID: (id: string) => `/api/admin/blog/${id}`,
  BUNDLES: "/api/admin/bundles",
  BUNDLE_BY_ID: (id: string) => `/api/admin/bundles/${id}`,
  BUNDLE_REBUILD: (id: string) => `/api/admin/bundles/${id}/rebuild`,
  CATEGORIES: "/api/admin/categories",
  CATEGORY_BY_ID: (id: string) => `/api/admin/categories/${id}`,
  BRANDS: "/api/admin/brands",
  BRAND_BY_ID: (id: string) => `/api/admin/brands/${id}`,
  FAQS: "/api/admin/faqs",
  FAQ_BY_ID: (id: string) => `/api/admin/faqs/${id}`,
  TESTER_CHECKLIST_ITEMS: "/api/admin/tester-checklist-items",
  TESTER_CHECKLIST_ITEM_BY_ID: (id: string) => `/api/admin/tester-checklist-items/${id}`,
  TESTER_CHECKLIST_ITEM_REOPEN: (id: string) => `/api/admin/tester-checklist-items/${id}/reopen`,
  TESTER_FEEDBACK: "/api/admin/tester-feedback",
  TESTER_FEEDBACK_BY_ID: (id: string) => `/api/admin/tester-feedback/${id}`,
  TESTER_FEEDBACK_REPORT: "/api/admin/tester-feedback/report",
  TESTER_FEEDBACK_EXPORT: "/api/admin/tester-feedback/export",
  TESTER_FEEDBACK_CONFIRM_BUG: (id: string) => `/api/admin/tester-feedback/${id}/confirm-bug`,
  STORES: "/api/admin/stores",
  STORE_BY_ID: (uid: string) => `/api/admin/stores/${uid}`,
  PAYOUTS: "/api/admin/payouts",
  PAYOUT_BY_ID: (id: string) => `/api/admin/payouts/${id}`,
  PAYOUTS_WEEKLY: "/api/admin/payouts/weekly",
  PAYOUTS_EXPORT: "/api/admin/payouts/export",
  AUDIT_LOG: "/api/admin/audit-log",
  AUDIT_LOG_BY_ID: (id: string) => `/api/admin/audit-log/${id}`,
  SHIPMENTS: "/api/admin/shipments",
  SHIPMENT_BY_ID: (id: string) => `/api/admin/shipments/${id}`,
  SHIPMENT_LOTS: (id: string) => `/api/admin/shipments/${id}/lots`,
  SHIPMENT_LOT_BY_ID: (id: string, lotId: string) => `/api/admin/shipments/${id}/lots/${lotId}`,
  SHIPMENT_LOT_ITEMS: (id: string, lotId: string) => `/api/admin/shipments/${id}/lots/${lotId}/items`,
  SHIPMENT_LOT_ITEM_BY_ID: (id: string, lotId: string, itemId: string) =>
    `/api/admin/shipments/${id}/lots/${lotId}/items/${itemId}`,
  SHIPMENT_LOT_ITEMS_BULK: (id: string, lotId: string) => `/api/admin/shipments/${id}/lots/${lotId}/items/bulk`,
  SHIPMENT_LOT_ITEM_LINK: (id: string, lotId: string, itemId: string) =>
    `/api/admin/shipments/${id}/lots/${lotId}/items/${itemId}/link`,
  SHIPMENTS_PROJECTIONS: "/api/admin/shipments/projections",
  CATALOGUE_APPROVALS: "/api/admin/catalogue",
  CATALOGUE_APPROVE: (id: string) => `/api/admin/catalogue/${id}/approve`,
  CATALOGUE_REJECT: (id: string) => `/api/admin/catalogue/${id}/reject`,
  EVENTS: "/api/admin/events",
  EVENT_BY_ID: (id: string) => `/api/admin/events/${id}`,
  EVENT_STATUS: (id: string) => `/api/admin/events/${id}/status`,
  /**
   * The ONLY sanctioned writer of `lotteryConfig`. The generic EVENT_BY_ID
   * PATCH rejects that field — it is `.passthrough()`, and letting a slot
   * array through it erased every already-pulled slot.
   */
  EVENT_LOTTERY_CONFIG: (id: string) => `/api/admin/events/${id}/lottery-config`,
  EVENT_STATS: (id: string) => `/api/admin/events/${id}/stats`,
  EVENT_ENTRIES: (id: string) => `/api/admin/events/${id}/entries`,
  EVENT_ENTRIES_EXPORT: (id: string) => `/api/admin/events/${id}/entries/export`,
  EVENT_ENTRY_BY_ID: (eventId: string, entryId: string) =>
    `/api/admin/events/${eventId}/entries/${entryId}`,
  // SB9-D — admin manual raffle trigger
  EVENT_TRIGGER_RAFFLE: (id: string) => `/api/admin/events/${id}/trigger-raffle`,
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
  ADMIN_NOTIFICATIONS_BULK: "/api/admin/notifications/bulk",
  ADMIN_NOTIFICATION_BY_ID: (id: string) => `/api/admin/notifications/${id}`,
  ADMIN_NOTIFICATION_RESEND: (id: string) => `/api/admin/notifications/${id}/resend`,
  ADMIN_CARTS: "/api/admin/carts",
  ADMIN_WISHLISTS: "/api/admin/wishlists",
  ADMIN_HISTORY: "/api/admin/history",
  NEWSLETTER_EXPORT: "/api/admin/newsletter/export",
  STORE_ADDRESSES: "/api/admin/store-addresses",
  CAROUSEL: "/api/admin/carousel",
  CAROUSEL_BY_ID: (id: string) => `/api/admin/carousel/${id}`,
  CAROUSEL_REORDER: "/api/admin/carousel/reorder",
  CAROUSELS: "/api/admin/carousels",
  CAROUSELS_BY_ID: (id: string) => `/api/admin/carousels/${id}`,
  NAVIGATION: "/api/admin/navigation",
  NAVIGATION_BY_ID: (id: string) => `/api/admin/navigation/${id}`,
  ADMIN_SITE: "/api/admin/site",
  SUBLISTING_CATEGORIES: "/api/admin/sublisting-categories",
  SUBLISTING_CATEGORY_BY_ID: (id: string) => `/api/admin/sublisting-categories/${id}`,
  PRODUCT_FEATURES: "/api/admin/features",
  PRODUCT_FEATURE_BY_ID: (id: string) => `/api/admin/features/${id}`,
  TEAM: "/api/admin/team",
  TEAM_MEMBER: (uid: string) => `/api/admin/team/${uid}`,
  USER_HARD_BAN: (uid: string) => `/api/admin/users/${uid}/hard-ban`,
  USER_UNBAN: (uid: string) => `/api/admin/users/${uid}/unban`,
  USER_SOFT_BAN: (uid: string) => `/api/admin/users/${uid}/soft-ban`,
  USER_SOFT_BAN_LIFT: (uid: string, action: string) =>
    `/api/admin/users/${uid}/soft-ban/${encodeURIComponent(action)}`,
  SUPPORT_TICKETS: "/api/admin/support-tickets",
  SUPPORT_TICKET_BY_ID: (id: string) => `/api/admin/support-tickets/${id}`,
  SCAMMERS: "/api/admin/scammers",
  SCAMMER_BY_ID: (id: string) => `/api/admin/scammers/${id}`,
  ADDRESSES: "/api/admin/addresses",
  ADDRESS_BY_ID: (id: string) => `/api/admin/addresses/${id}`,
  ADDRESS_CLUSTERS: "/api/admin/addresses/clusters",
  PAYMENT_METHODS: "/api/admin/payment-methods",
  PAYMENT_METHOD_BY_ID: (id: string) => `/api/admin/payment-methods/${id}`,
  PAYMENT_METHOD_CLUSTERS: "/api/admin/payment-methods/clusters",
  GROUPED_LISTINGS: "/api/admin/grouped-listings",
  GROUPED_LISTING_BY_ID: (id: string) => `/api/admin/grouped-listings/${id}`,
  ADMIN_FULFILLMENT: (storeId: string) => `/api/store/fulfillment?storeId=${encodeURIComponent(storeId)}`,
  CHECKOUT_BYPASS: "/api/admin/checkout-bypass",
  MAINTENANCE_ANALYSIS: "/api/admin/maintenance/analysis",
  MAINTENANCE_CLOUD_LOGS: "/api/admin/maintenance/cloud-logs",
  MEDIA_LIST: "/api/admin/media",
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
  BY_ITEM_ID: (itemId: string) => `/api/cart/${encodeURIComponent(itemId)}`,
  VALIDATE: "/api/cart/validate",
  SELECTION: "/api/cart/selection",
  /** Per-store paid add-on selections — the source of truth for what's charged. */
  ADDONS: "/api/cart/addons",
  COUPON: "/api/cart/coupon",
  /**
   * Add a buyer-assembled group selection as ONE line. Separate from `GET`'s
   * POST on purpose: that is the hot path behind every product card's
   * Add-to-cart, and widening its `{productId, quantity}` schema into a
   * discriminated union would put this feature's blast radius on it.
   */
  GROUP: "/api/cart/group",
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
  /** @param qs — pre-built querystring (no leading `?`) for structured filters */
  FILTERED: (qs: string) => `/api/categories?${qs}`,
} as const;

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export const CHECKOUT_ENDPOINTS = {
  PREFLIGHT: "/api/checkout/preflight",
  PLACE_ORDER: "/api/checkout",
  PRICING_PREVIEW: "/api/checkout/pricing-preview",
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
  HISTORY: "/api/copilot/history",
} as const;

// ---------------------------------------------------------------------------
// Corporate
// ---------------------------------------------------------------------------

export const CORPORATE_ENDPOINTS = {
  INQUIRIES: "/api/corporate-inquiries",
} as const;

// ---------------------------------------------------------------------------
// Contact (public contact-us form)
// ---------------------------------------------------------------------------

export const CONTACT_ENDPOINTS = {
  SUBMIT: "/api/contact",
} as const;

// ---------------------------------------------------------------------------
// Ads (public — active ad lookup by slot)
// ---------------------------------------------------------------------------

export const AD_ENDPOINTS = {
  ACTIVE_BY_SLOT: (slotId: string) => `/api/ads?slot=${encodeURIComponent(slotId)}`,
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
  // SB9-E user spin assignment
  SPIN: (id: string) => `/api/events/${id}/spin`,
  // Lottery: user self-pull (draw happens immediately on submit)
  LOTTERY_PULL: (id: string) => `/api/events/${id}/lottery-pull`,
  LOTTERY_ENTRIES: (id: string) => `/api/events/${id}/lottery-entries`,
} as const;

// ---------------------------------------------------------------------------
// Lottery
// ---------------------------------------------------------------------------

export const LOTTERY_ENDPOINTS = {
  FLAG_ENTRY: (entryId: string) => `/api/lottery-entries/${entryId}/flag`,
  REOPEN_SLOT: (entryId: string) => `/api/lottery-entries/${entryId}/reopen-slot`,
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
// Analytics — page-view tracking (public pages only)
// ---------------------------------------------------------------------------

export const ANALYTICS_ENDPOINTS = {
  PAGE_VIEW: "/api/analytics/pageview",
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
  /** Watermark-proxy for external (non-Firebase-Storage) image URLs. */
  EXT: "/api/media/ext",
  EXT_URL: (url: string) => `/api/media/ext?url=${encodeURIComponent(url)}`,
} as const;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const ORDER_ENDPOINTS = {
  LIST: "/api/orders",
  BY_ID: (id: string) => `/api/orders/${id}`,
  TRACK: (trackingId: string) => `/api/orders/track/${trackingId}`,
  PAYMENT_PROOF: (id: string) => `/api/orders/${id}/payment-proof`,
  DISPUTE: (id: string) => `/api/orders/${id}/dispute`,
} as const;

// ---------------------------------------------------------------------------
// Pre-orders
// ---------------------------------------------------------------------------

export const PREORDER_ENDPOINTS = {
  LIST: "/api/pre-orders",
  BY_SLUG: (slug: string) => `/api/pre-orders/${slug}`,
} as const;

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const PRODUCT_ENDPOINTS = {
  LIST: "/api/products",
  BY_SLUG: (slug: string) => `/api/products/${slug}`,
  BY_ID: (id: string) => `/api/products/${id}`,
  // Lottery: user self-pull for prize-draw products in lottery mode
  LOTTERY_PULL: (id: string) => `/api/products/${id}/lottery-pull`,
  LOTTERY_ENTRIES: (id: string) => `/api/products/${id}/lottery-entries`,
  SEARCH: (query: string, pageSize = 20) =>
    `/api/products?q=${encodeURIComponent(query)}&pageSize=${pageSize}`,
  /** @param ids — comma-separated product ids, e.g. for a compare-tray fetch */
  BY_IDS: (ids: string) => `/api/products?ids=${encodeURIComponent(ids)}`,
  GROUP_BY_ID: (groupId: string) => `/api/products/group/${encodeURIComponent(groupId)}`,
} as const;

// ---------------------------------------------------------------------------
// Prize Draws — no client-callable endpoints. Reveal is fully automatic
// (assignPrizeDrawWinner, triggered by payment confirmation / sellout /
// expiry) — there is no buyer-facing reveal action to call anymore.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sublisting Categories (public)
// ---------------------------------------------------------------------------

export const SUBLISTING_CATEGORY_ENDPOINTS = {
  BY_ID: (id: string) => `/api/sublisting-categories/${encodeURIComponent(id)}`,
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
  SUGGESTIONS: "/api/search/suggestions",
  /** @param params — pre-built querystring (no leading `?`) from a caller-owned URLSearchParams */
  RAW: (params: string) => `/api/search?${params}`,
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
  PAYOUT_BY_ID: (id: string) => `/api/store/payouts/${id}`,
  PAYOUT_SETTINGS: "/api/store/payout-settings",
  PAYOUT_REQUEST: "/api/store/payouts/request",
  REVIEWS: "/api/store/reviews",
  REVIEW_CONTEST: (id: string) => `/api/store/reviews/${id}/contest`,
  REVIEW_FEEDBACK: (id: string) => `/api/store/reviews/${id}/feedback`,
  SHIPPING: "/api/store/shipping",
  STORE: "/api/store/storefront",
  STORE_ADDRESSES: "/api/store/addresses",
  STORE_ADDRESS_BY_ID: (id: string) => `/api/store/addresses/${id}`,
  BIDS: "/api/store/bids",
  BID_BY_ID: (id: string) => `/api/store/bids/${id}`,
  DASHBOARD: "/api/store/dashboard",
  ANALYTICS: (period?: string) =>
    `/api/store/analytics${period ? `?period=${period}` : ""}`,
  FEATURES: "/api/store/features",
  FEATURE_BY_ID: (id: string) => `/api/store/features/${id}`,
  PRODUCTS_BULK_LOCATION: "/api/store/products/bulk-location",
  ORDERS_BULK_LOCATION: "/api/store/orders/bulk-location",
  GROUPED_LISTINGS: "/api/store/grouped-listings",
  GROUPED_LISTING_BY_ID: (id: string) => `/api/store/grouped-listings/${id}`,
  ANALYTICS_ALERTS: "/api/store/analytics/alerts",
  ANALYTICS_ALERT_BY_ID: (id: string) => `/api/store/analytics/alerts/${id}`,
  STORE_CATEGORIES: "/api/store/categories",
  STORE_CATEGORY_BY_ID: (id: string) => `/api/store/categories/${id}`,
  PAYOUT_METHODS: "/api/store/payout-methods",
  PAYOUT_METHOD_BY_ID: (id: string) => `/api/store/payout-methods/${id}`,
  SHIPPING_CONFIGS: "/api/store/shipping-configs",
  SHIPPING_CONFIG_BY_ID: (id: string) => `/api/store/shipping-configs/${id}`,
  GOOGLE_REVIEWS: "/api/store/google-reviews",
  GOOGLE_REVIEWS_SYNC: "/api/store/google-reviews/sync",
  PRODUCTS_SCAN: (barcode: string) =>
    `/api/store/products/scan?barcode=${encodeURIComponent(barcode)}`,
  ORDERS_FULFILLMENT: "/api/store/fulfillment",
  BUNDLES: "/api/store/bundles",
  /** Tickets raised ABOUT this store (W11). */
  SUPPORT: "/api/store/support",
  BUNDLE_BY_ID: (id: string) => `/api/store/bundles/${id}`,
  ORDERS_ASSIGN: (orderId: string) => `/api/store/orders/${orderId}/assign`,
  PRODUCT_BY_ID: (id: string) => `/api/store/products/${id}`,
  PRODUCT_DUPLICATE: (id: string) => `/api/store/products/${id}/duplicate`,
} as const;

// ---------------------------------------------------------------------------
// Brands (public)
// ---------------------------------------------------------------------------

export const BRAND_ENDPOINTS = {
  LIST: "/api/brands",
  BY_ID: (id: string) => `/api/brands/${id}`,
  /** @param qs — pre-built querystring (no leading `?`) for structured filters */
  FILTERED: (qs: string) => `/api/brands?${qs}`,
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
  ADD: "/api/wishlist",
  MERGE: "/api/wishlist/merge",
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

// ---------------------------------------------------------------------------
// Reports (content/listing abuse reports)
// ---------------------------------------------------------------------------

export const REPORT_ENDPOINTS = {
  SUBMIT: "/api/reports",
} as const;

// ---------------------------------------------------------------------------
// Support Tickets (user-facing)
// ---------------------------------------------------------------------------

export const SUPPORT_ENDPOINTS = {
  TICKETS: "/api/support/tickets",
  TICKET_BY_ID: (id: string) => `/api/support/tickets/${id}`,
  TICKET_MESSAGES: (id: string) => `/api/support/tickets/${id}/messages`,
} as const;

// ---------------------------------------------------------------------------
// Scammers (public)
// ---------------------------------------------------------------------------

export const SCAMMER_ENDPOINTS = {
  LIST: "/api/scammers",
  BY_SLUG: (slug: string) => `/api/scammers/${slug}`,
  REPORT: "/api/scammers/report",
} as const;

// ---------------------------------------------------------------------------
// Before / After
// ---------------------------------------------------------------------------

export const BEFORE_AFTER_ENDPOINTS = {
  LIST: "/api/before-after",
} as const;

// ---------------------------------------------------------------------------
// WhatsApp Business (store-level settings + catalog sync)
// ---------------------------------------------------------------------------

export const WHATSAPP_SELLER_ENDPOINTS = {
  SETTINGS: "/api/store/whatsapp-settings",
  CATALOG_SYNC: "/api/store/whatsapp-settings/catalog-sync",
  CATALOG_IMPORT: "/api/store/whatsapp-settings/catalog-import",
} as const;

// ---------------------------------------------------------------------------
// Aggregate namespace export
// ---------------------------------------------------------------------------

export const API_ENDPOINTS = {
  CONFIG: CONFIG_ENDPOINTS,
  LOGS: LOGS_ENDPOINTS,
  CLIENT_ERRORS: CLIENT_ERROR_ENDPOINTS,
  AUTH: AUTH_ENDPOINTS,
  ACCOUNT: ACCOUNT_ENDPOINTS,
  NOTIFICATIONS: NOTIFICATIONS_ENDPOINTS,
  SITE_SETTINGS: SITE_SETTINGS_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS,
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
  CONTACT: CONTACT_ENDPOINTS,
  ADS: AD_ENDPOINTS,
  EVENTS: EVENT_ENDPOINTS,
  LOTTERY: LOTTERY_ENDPOINTS,
  FAQS: FAQ_ENDPOINTS,
  HOMEPAGE: HOMEPAGE_ENDPOINTS,
  LOYALTY: LOYALTY_ENDPOINTS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
  MEDIA: MEDIA_ENDPOINTS,
  ORDERS: ORDER_ENDPOINTS,
  PREORDERS: PREORDER_ENDPOINTS,
  PRODUCTS: PRODUCT_ENDPOINTS,
  PROMOTIONS: PROMOTION_ENDPOINTS,
  REVIEWS: REVIEW_ENDPOINTS,
  SEARCH: SEARCH_ENDPOINTS,
  SELLER: SELLER_ENDPOINTS,
  BRANDS: BRAND_ENDPOINTS,
  BLOG: BLOG_ENDPOINTS,
  STORES: STORE_ENDPOINTS,
  SUBLISTING_CATEGORIES: SUBLISTING_CATEGORY_ENDPOINTS,
  WISHLIST: WISHLIST_ENDPOINTS,
  PROFILE_STATS: PROFILE_STATS_ENDPOINTS,
  WHATSAPP_SELLER: WHATSAPP_SELLER_ENDPOINTS,
  SUPPORT: SUPPORT_ENDPOINTS,
  SCAMMERS: SCAMMER_ENDPOINTS,
  REPORTS: REPORT_ENDPOINTS,
} as const;

/** Canonical alias — prefer API_ROUTES over API_ENDPOINTS in new code. */
export const API_ROUTES = API_ENDPOINTS;
