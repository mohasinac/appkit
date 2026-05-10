/**
 * Permission & Role-Based Access Control Constants
 *
 * Single source of truth for all Permission strings, EmployeeGroup presets,
 * PERMISSION_GROUPS bundles, and StoreCapability flags.
 *
 * Design: admin role bypasses all permission checks. employee role is gated
 * entirely by the permissions[] field on their UserDocument. Roles are convenience
 * bundles — individual employees can have custom overrides on top of their preset.
 *
 * Permission naming: admin:resource:action
 * Ban action naming: plain verb phrase — write_reviews, place_bids, etc.
 */

// ============================================================================
// PERMISSION TYPE
// ============================================================================

export type Permission =
  // Dashboard
  | "admin:dashboard:view"

  // Management — Users
  | "admin:users:read"
  | "admin:users:write"
  | "admin:users:delete"
  | "admin:user-bans:read"
  | "admin:user-bans:write"

  // Management — Products
  | "admin:products:read"
  | "admin:products:write"
  | "admin:products:delete"

  // Management — Orders & Returns
  | "admin:orders:read"
  | "admin:orders:write"
  | "admin:returns:read"
  | "admin:returns:write"

  // Management — Stores
  | "admin:stores:read"
  | "admin:stores:write"
  | "admin:store-addresses:read"

  // Finance
  | "admin:analytics:view"
  | "admin:payouts:read"
  | "admin:payouts:write"

  // Catalog
  | "admin:categories:read"
  | "admin:categories:write"
  | "admin:categories:delete"
  | "admin:brands:read"
  | "admin:brands:write"
  | "admin:brands:delete"
  | "admin:coupons:read"
  | "admin:coupons:write"
  | "admin:coupons:delete"
  | "admin:deals:read"
  | "admin:deals:write"
  | "admin:featured:read"
  | "admin:featured:write"

  // Content
  | "admin:reviews:read"
  | "admin:reviews:write"
  | "admin:reviews:delete"
  | "admin:blog:read"
  | "admin:blog:write"
  | "admin:blog:delete"
  | "admin:blog:publish"
  | "admin:bids:read"
  | "admin:bids:write"
  | "admin:media:read"
  | "admin:media:write"
  | "admin:media:delete"

  // Site / CMS
  | "admin:site:read"
  | "admin:site:write"
  | "admin:navigation:read"
  | "admin:navigation:write"
  | "admin:sections:read"
  | "admin:sections:write"
  | "admin:carousel:read"
  | "admin:carousel:write"
  | "admin:carousel:delete"
  | "admin:ads:read"
  | "admin:ads:write"
  | "admin:ads:delete"
  | "admin:faqs:read"
  | "admin:faqs:write"
  | "admin:faqs:delete"
  | "admin:newsletter:read"
  | "admin:newsletter:write"
  | "admin:contact:read"

  // Events
  | "admin:events:read"
  | "admin:events:write"
  | "admin:events:delete"
  | "admin:event-entries:read"
  | "admin:event-entries:write"

  // Support Tickets
  | "admin:support-tickets:read"
  | "admin:support-tickets:write"
  | "admin:support-tickets:assign"
  | "admin:support-tickets:close"

  // Scam Registry
  | "admin:scammers:read"
  | "admin:scammers:write"
  | "admin:scammers:verify"
  | "admin:scammers:delete"

  // System (admin-only; never grant to employees via team UI)
  | "admin:sessions:read"
  | "admin:sessions:delete"
  | "admin:notifications:read"
  | "admin:notifications:write"
  | "admin:carts:read"
  | "admin:wishlists:read"
  | "admin:feature-flags:read"
  | "admin:feature-flags:write"
  | "admin:copilot:view"
  | "admin:team:read"
  | "admin:team:write";

// ============================================================================
// BANNED ACTION TYPE
// ============================================================================

/**
 * Granular user actions that can be soft-banned individually.
 * A user may have multiple simultaneous soft bans of different types.
 * Hard ban (disabled: true) overrides all of these.
 */
export type BannedAction =
  | "write_reviews" // cannot submit product reviews
  | "write_blog_comments" // cannot comment on blog posts (future)
  | "join_events" // cannot register for events/tournaments
  | "place_bids" // cannot bid on auctions
  | "create_listings" // seller cannot create new listings
  | "send_messages" // cannot send direct messages
  | "create_support_tickets" // cannot open new support tickets
  | "report_scammers"; // cannot submit scam reports

// ============================================================================
// EMPLOYEE GROUP TYPE
// ============================================================================

/**
 * Preset permission bundles. "custom" = no preset, permissions set individually.
 * Used for display and for pre-filling the permissions editor when inviting employees.
 */
export type EmployeeGroup =
  | "content_moderator"
  | "review_manager"
  | "blog_poster"
  | "community_manager"
  | "event_handler"
  | "newsletter_manager"
  | "seo_manager"
  | "ad_manager"
  | "site_manager"
  | "catalog_manager"
  | "finance_manager"
  | "data_analyst"
  | "customer_support"
  | "support_agent"
  | "store_onboarding"
  | "trust_and_safety"
  | "auction_monitor"
  | "scam_moderator"
  | "custom";

// ============================================================================
// PERMISSION GROUP PRESETS
// ============================================================================

/**
 * Pre-defined permission bundles for each EmployeeGroup.
 * Admin always bypasses; these bundles are only relevant for role=employee.
 */
export const PERMISSION_GROUPS: Record<
  Exclude<EmployeeGroup, "custom">,
  Permission[]
> = {
  content_moderator: [
    "admin:dashboard:view",
    "admin:reviews:read",
    "admin:reviews:write",
    "admin:reviews:delete",
    "admin:products:read",
    "admin:users:read",
    "admin:blog:read",
  ],

  review_manager: [
    "admin:dashboard:view",
    "admin:reviews:read",
    "admin:reviews:write",
    "admin:reviews:delete",
    "admin:products:read",
    "admin:users:read",
  ],

  blog_poster: [
    "admin:dashboard:view",
    "admin:blog:read",
    "admin:blog:write",
    // NOT blog:delete or blog:publish — junior writer only
    "admin:media:read",
    "admin:media:write",
  ],

  community_manager: [
    "admin:dashboard:view",
    "admin:events:read",
    "admin:events:write",
    "admin:events:delete",
    "admin:event-entries:read",
    "admin:event-entries:write",
    "admin:blog:read",
    "admin:blog:write",
    "admin:blog:publish",
    "admin:reviews:read",
    "admin:notifications:read",
    "admin:notifications:write",
    "admin:newsletter:read",
    "admin:newsletter:write",
    "admin:media:read",
    "admin:media:write",
  ],

  event_handler: [
    "admin:dashboard:view",
    "admin:events:read",
    "admin:events:write",
    "admin:events:delete",
    "admin:event-entries:read",
    "admin:event-entries:write",
    "admin:notifications:read",
    "admin:notifications:write",
  ],

  newsletter_manager: [
    "admin:dashboard:view",
    "admin:newsletter:read",
    "admin:newsletter:write",
    "admin:contact:read",
    "admin:users:read",
  ],

  seo_manager: [
    "admin:dashboard:view",
    "admin:faqs:read",
    "admin:faqs:write",
    "admin:faqs:delete",
    "admin:blog:read",
    "admin:blog:write",
    "admin:blog:publish",
    "admin:navigation:read",
    "admin:navigation:write",
    "admin:sections:read",
    "admin:sections:write",
    "admin:site:read",
  ],

  ad_manager: [
    "admin:dashboard:view",
    "admin:ads:read",
    "admin:ads:write",
    "admin:ads:delete",
    "admin:carousel:read",
    "admin:carousel:write",
    "admin:carousel:delete",
    "admin:deals:read",
    "admin:deals:write",
    "admin:featured:read",
    "admin:featured:write",
    "admin:sections:read",
    "admin:sections:write",
  ],

  site_manager: [
    "admin:dashboard:view",
    "admin:site:read",
    "admin:site:write",
    "admin:navigation:read",
    "admin:navigation:write",
    "admin:sections:read",
    "admin:sections:write",
    "admin:carousel:read",
    "admin:carousel:write",
    "admin:faqs:read",
    "admin:faqs:write",
    "admin:media:read",
    "admin:media:write",
  ],

  catalog_manager: [
    "admin:dashboard:view",
    "admin:categories:read",
    "admin:categories:write",
    "admin:categories:delete",
    "admin:brands:read",
    "admin:brands:write",
    "admin:brands:delete",
    "admin:products:read",
    "admin:products:write",
    "admin:media:read",
    "admin:media:write",
    "admin:deals:read",
    "admin:deals:write",
    "admin:featured:read",
    "admin:featured:write",
  ],

  finance_manager: [
    "admin:dashboard:view",
    "admin:analytics:view",
    "admin:payouts:read",
    "admin:payouts:write",
    "admin:orders:read",
    "admin:returns:read",
  ],

  data_analyst: [
    "admin:dashboard:view",
    "admin:analytics:view",
    "admin:orders:read",
    "admin:payouts:read",
    "admin:products:read",
    "admin:users:read",
    "admin:reviews:read",
    "admin:carts:read",
    "admin:wishlists:read",
    "admin:bids:read",
  ],

  customer_support: [
    "admin:dashboard:view",
    "admin:support-tickets:read",
    "admin:support-tickets:write",
    "admin:support-tickets:assign",
    "admin:support-tickets:close",
    "admin:orders:read",
    "admin:orders:write",
    "admin:returns:read",
    "admin:returns:write",
    "admin:users:read",
    "admin:contact:read",
    "admin:notifications:read",
    "admin:notifications:write",
  ],

  support_agent: [
    "admin:dashboard:view",
    "admin:support-tickets:read",
    "admin:support-tickets:write",
    "admin:support-tickets:assign",
    "admin:support-tickets:close",
    "admin:orders:read",
    "admin:returns:read",
    "admin:users:read",
    "admin:contact:read",
    "admin:notifications:read",
    "admin:notifications:write",
  ],

  store_onboarding: [
    "admin:dashboard:view",
    "admin:stores:read",
    "admin:stores:write",
    "admin:store-addresses:read",
    "admin:users:read",
    "admin:notifications:write",
  ],

  trust_and_safety: [
    "admin:dashboard:view",
    "admin:users:read",
    "admin:users:write",
    "admin:user-bans:read",
    "admin:user-bans:write",
    "admin:orders:read",
    "admin:products:read",
    "admin:products:write",
    "admin:reviews:read",
    "admin:reviews:write",
    "admin:reviews:delete",
    "admin:bids:read",
    "admin:bids:write",
    "admin:sessions:read",
    "admin:sessions:delete",
    "admin:carts:read",
    "admin:support-tickets:read",
    "admin:support-tickets:write",
    "admin:support-tickets:close",
    "admin:scammers:read",
    "admin:scammers:write",
    "admin:scammers:verify",
  ],

  auction_monitor: [
    "admin:dashboard:view",
    "admin:bids:read",
    "admin:bids:write",
    "admin:products:read",
    "admin:orders:read",
    "admin:users:read",
    "admin:notifications:write",
  ],

  scam_moderator: [
    "admin:dashboard:view",
    "admin:scammers:read",
    "admin:scammers:write",
    "admin:scammers:verify",
    "admin:scammers:delete",
    "admin:users:read",
    "admin:media:read",
    "admin:media:write",
  ],
} as const;

// ============================================================================
// ROUTE → PERMISSION MAP
// ============================================================================

/**
 * Maps each /admin/[section] pathname prefix to the permission required to READ it.
 * Write/delete operations use the corresponding write/delete permission at the API level.
 * Admin role bypasses this map entirely.
 */
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  "/admin/dashboard": "admin:dashboard:view",
  "/admin/users": "admin:users:read",
  "/admin/products": "admin:products:read",
  "/admin/orders": "admin:orders:read",
  "/admin/return-requests": "admin:returns:read",
  "/admin/stores": "admin:stores:read",
  "/admin/store-addresses": "admin:store-addresses:read",
  "/admin/analytics": "admin:analytics:view",
  "/admin/payouts": "admin:payouts:read",
  "/admin/categories": "admin:categories:read",
  "/admin/brands": "admin:brands:read",
  "/admin/coupons": "admin:coupons:read",
  "/admin/deals": "admin:deals:read",
  "/admin/featured": "admin:featured:read",
  "/admin/reviews": "admin:reviews:read",
  "/admin/blog": "admin:blog:read",
  "/admin/bids": "admin:bids:read",
  "/admin/media": "admin:media:read",
  "/admin/site": "admin:site:read",
  "/admin/navigation": "admin:navigation:read",
  "/admin/sections": "admin:sections:read",
  "/admin/carousel": "admin:carousel:read",
  "/admin/ads": "admin:ads:read",
  "/admin/faqs": "admin:faqs:read",
  "/admin/newsletter": "admin:newsletter:read",
  "/admin/contact": "admin:contact:read",
  "/admin/events": "admin:events:read",
  "/admin/event-entries": "admin:event-entries:read",
  "/admin/support-tickets": "admin:support-tickets:read",
  "/admin/scammers": "admin:scammers:read",
  // System — rarely granted to employees
  "/admin/sessions": "admin:sessions:read",
  "/admin/notifications": "admin:notifications:read",
  "/admin/carts": "admin:carts:read",
  "/admin/wishlists": "admin:wishlists:read",
  "/admin/feature-flags": "admin:feature-flags:read",
  "/admin/copilot": "admin:copilot:view",
  "/admin/team": "admin:team:read",
};

// ============================================================================
// STORE CAPABILITY TYPE
// ============================================================================

/**
 * Per-store feature flags stored as capabilities[] on StoreDocument.
 * Managed by admin via AdminStoreEditorView.
 * Checked server-side on store API routes — client check is UX only.
 *
 * Defaults on store creation: ["suggest_brands", "create_coupons"]
 */
export type StoreCapability =
  // Listing & Catalog
  | "host_auctions" // can create auction listings
  | "host_preorders" // can create pre-order listings
  | "create_categories" // can request new categories (goes to admin)
  | "suggest_brands" // can suggest new brands (default on)
  | "create_coupons" // can create store-level coupons (default on)
  | "bulk_listing_import" // can bulk-import products via CSV
  | "extended_return_window" // can offer 30-day returns (platform default: 7 days)

  // Trust & Visibility
  | "verified_seller" // shows Verified badge on store + products
  | "featured_placement" // eligible for featured store sections
  | "promotional_banner" // banner usable in carousel/promotional sections
  | "priority_support" // dedicated support queue

  // Platform & Technical
  | "multiple_stores" // owner can create more than one store
  | "custom_store_slug" // can change store slug after 7-day lock period
  | "api_access" // programmatic API credentials (future)
  | "lower_commission_rate" // negotiated reduced platform fee; requires customCommissionRate
  | "early_access_features" // beta features before GA
  | "advanced_analytics"; // cohort/basket analysis beyond summary stats

/** Default capabilities granted to every new store on creation. */
export const DEFAULT_STORE_CAPABILITIES: StoreCapability[] = [
  "suggest_brands",
  "create_coupons",
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check whether a permission array includes a required permission.
 * Use server-side only — never trust client-supplied permission arrays.
 */
export function hasPermission(
  permissions: Permission[],
  required: Permission,
): boolean {
  return permissions.includes(required);
}

/**
 * Check whether a permission array includes ANY of the required permissions.
 */
export function hasAnyPermission(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.some((p) => permissions.includes(p));
}

/**
 * Check whether a permission array includes ALL of the required permissions.
 */
export function hasAllPermissions(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.every((p) => permissions.includes(p));
}

/**
 * Check whether a store's capabilities include a specific capability.
 */
export function hasCapability(
  capabilities: StoreCapability[],
  required: StoreCapability,
): boolean {
  return capabilities.includes(required);
}
