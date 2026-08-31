/**
 * Schema Field Name Constants — canonical source of truth (appkit)
 *
 * Centralized string constants for ALL Firestore document field names.
 * Use these instead of hardcoded strings to ensure consistency between
 * frontend types, backend APIs, and Firestore queries.
 *
 * Consumer app re-exports from "@mohasinac/appkit" — never edit src/constants/field-names.ts directly.
 */

// ============================================================================
// AVAILABILITY SCOPE (not a stored field — a derived listing-surface scope)
// ============================================================================

/**
 * The three-state scope every listing surface (public browse, store tabs,
 * category/brand panels, admin/seller dashboards) offers as a tab bar.
 *
 * DELIBERATELY NOT a Firestore field. "Unavailable" means different things to
 * different listing types — an auction ENDS, a product SELLS OUT, a prize draw
 * CLOSES, a code pool DEPLETES — so there is no single column to filter on.
 * The per-type meaning lives on each listing-type plugin
 * (`isAvailable` / `unavailableClauses` in `_internal/shared/listing-types/`),
 * and `availabilityTabsFor()` derives the middle tab's label from the plugin's
 * `hideDefault`. Do not add a mirror field to ProductDocument to "simplify"
 * this — a denormalised mirror drifts the first time a write path forgets it
 * (Recurrent Root Cause #42).
 */
export const AVAILABILITY_VALUES = {
  /** Still buyable / biddable / enterable. The default when the param is absent. */
  AVAILABLE: "available",
  /** Sold out, ended, closed, or depleted — the archive. */
  UNAVAILABLE: "unavailable",
  /** No availability predicate at all. The only scope with an exact total. */
  ALL: "all",
} as const;

export type AvailabilityFilter =
  (typeof AVAILABILITY_VALUES)[keyof typeof AVAILABILITY_VALUES];

export function isAvailabilityFilter(value: string): value is AvailabilityFilter {
  return (Object.values(AVAILABILITY_VALUES) as string[]).includes(value);
}

// ============================================================================
// PRODUCT FIELDS
// ============================================================================

export const PRODUCT_FIELDS = {
  ID: "id",
  TITLE: "title",
  DESCRIPTION: "description",
  SLUG: "slug",
  CATEGORY: "category",
  CATEGORY_SLUGS: "categorySlugs",
  CATEGORY_SLUG: "categorySlug",
  SUBCATEGORY: "subcategory",
  BRAND: "brand",
  BRAND_SLUG: "brandSlug",
  PRICE: "price",
  CURRENCY: "currency",
  STOCK_QUANTITY: "stockQuantity",
  AVAILABLE_QUANTITY: "availableQuantity",
  IS_SOLD: "isSold",
  MAIN_IMAGE: "mainImage",
  IMAGES: "images",
  VIDEO: "video",
  STATUS: "status",
  SELLER_ID: "sellerId",
  STORE_ID: "storeId",
  SELLER_NAME: "sellerName",
  SELLER_EMAIL: "sellerEmail",
  FEATURED: "featured",
  TAGS: "tags",
  SPECIFICATIONS: "specifications",
  FEATURES: "features",
  SHIPPING_INFO: "shippingInfo",
  RETURN_POLICY: "returnPolicy",
  CONDITION: "condition",
  INSURANCE: "insurance",
  INSURANCE_COST: "insuranceCost",
  SHIPPING_PAID_BY: "shippingPaidBy",
  // SB1-G — canonical listing-kind discriminator (replaces removed isAuction / isPreOrder booleans)
  LISTING_TYPE: "listingType",
  AUCTION_END_DATE: "auctionEndDate",
  STARTING_BID: "startingBid",
  CURRENT_BID: "currentBid",
  BID_COUNT: "bidCount",
  RESERVE_PRICE: "reservePrice",
  BUY_NOW_PRICE: "buyNowPrice",
  MIN_BID_INCREMENT: "minBidIncrement",
  AUTO_EXTENDABLE: "autoExtendable",
  AUCTION_EXTENSION_MINUTES: "auctionExtensionMinutes",
  AUCTION_ORIGINAL_END_DATE: "auctionOriginalEndDate",
  AUCTION_SHIPPING_PAID_BY: "auctionShippingPaidBy",
  PRE_ORDER_DELIVERY_DATE: "preOrderDeliveryDate",
  PRE_ORDER_DEPOSIT_PERCENT: "preOrderDepositPercent",
  PRE_ORDER_DEPOSIT_AMOUNT: "preOrderDepositAmount",
  PRE_ORDER_MAX_QUANTITY: "preOrderMaxQuantity",
  PRE_ORDER_CURRENT_COUNT: "preOrderCurrentCount",
  PRE_ORDER_PRODUCTION_STATUS: "preOrderProductionStatus",
  PRE_ORDER_CANCELLABLE: "preOrderCancellable",
  IS_PROMOTED: "isPromoted",
  PROMOTION_END_DATE: "promotionEndDate",
  PICKUP_ADDRESS_ID: "pickupAddressId",
  SEO_TITLE: "seoTitle",
  SEO_DESCRIPTION: "seoDescription",
  SEO_KEYWORDS: "seoKeywords",
  VIEW_COUNT: "viewCount",
  // Prize draw fields (SB4)
  PRIZE_REVEAL_STATUS: "prizeRevealStatus",
  PRIZE_REVEAL_WINDOW_START: "prizeRevealWindowStart",
  PRIZE_REVEAL_WINDOW_END: "prizeRevealWindowEnd",
  PRIZE_DRAW_DURATION_DAYS: "prizeDrawDurationDays",
  PRIZE_REVEAL_MODE: "prizeRevealMode",
  PRIZE_CURRENT_ENTRIES: "prizeCurrentEntries",
  PRIZE_MAX_ENTRIES: "prizeMaxEntries",
  PRIZE_DRAW_MODE: "prizeDrawMode",
  PRICE_PER_ENTRY: "pricePerEntry",
  IS_PART_OF_BUNDLE: "isPartOfBundle",
  IS_ON_SALE: "isOnSale",
  IS_TEST_DATA: "isTestData",
  BIDS_HAVE_STARTED: "bidsHaveStarted",
  PRE_ORDER_CLOSED: "preOrderClosed",
  /**
   * Digital-code pool counters. NESTED under `digitalCode.*` on the document —
   * reading `row.codesAvailable` at the top level silently returns `undefined`
   * for every row, which is exactly the bug the old `isValidRelatedItem`
   * carried. Both paths are allowlisted in the products repository's
   * SIEVE_FIELDS.
   */
  DIGITAL_CODES_AVAILABLE: "digitalCode.codesAvailable",
  DIGITAL_CODE_POOL_SIZE: "digitalCode.codePoolSize",
  DIGITAL_CODE_DELIVERY_METHOD: "digitalCode.codeDeliveryMethod",
  /**
   * The Firestore field. NOTE the `Id` suffix: the URL/table key is
   * `sublistingCategory` (TABLE_KEYS.SUBLISTING_CATEGORY) but the stored field
   * is `sublistingCategoryId`. Emitting the table key as a filter field name
   * matches zero documents — always map across via this constant.
   */
  SUBLISTING_CATEGORY_ID: "sublistingCategoryId",
  SEARCH_TXT: "searchTxt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  STATUS_VALUES: {
    DRAFT: "draft",
    PUBLISHED: "published",
    IN_REVIEW: "in_review",
    ARCHIVED: "archived",
  },

  CONDITION_VALUES: {
    NEW: "new",
    LIKE_NEW: "like_new",
    GOOD: "good",
    FAIR: "fair",
    POOR: "poor",
    USED: "used",
    REFURBISHED: "refurbished",
    BROKEN: "broken",
    GRADED: "graded",
  },

  SHIPPING_PAID_BY_VALUES: {
    SELLER: "seller",
    BUYER: "buyer",
  },

  AUCTION_SHIPPING_PAID_BY_VALUES: {
    SELLER: "seller",
    WINNER: "winner",
  },

  /*
   * Corrected 2026-08-24 (W3). This block used to read
   * {in_production, ready, delayed, cancelled} — and `ready`, `delayed` and
   * `cancelled` were values no product has ever held. `ProductDocument`
   * declares "upcoming" | "in_production" | "ready_to_ship", the write schema
   * agrees, and all 9 seeded pre-orders store one of those three. It had zero
   * consumers, which is the only reason it never produced a visibly broken
   * filter chip (Recurrent Root Cause #33).
   */
  PRE_ORDER_PRODUCTION_STATUS_VALUES: {
    UPCOMING: "upcoming",
    IN_PRODUCTION: "in_production",
    READY_TO_SHIP: "ready_to_ship",
  },

  PRIZE_REVEAL_STATUS_VALUES: {
    PENDING: "pending",
    OPEN: "open",
    CLOSED: "closed",
  },

  PRIZE_REVEAL_MODE_VALUES: {
    INSTANT: "instant",
    SCHEDULED: "scheduled",
  },

  PRIZE_DRAW_MODE_VALUES: {
    REVEAL: "reveal",
    LOTTERY: "lottery",
  },

  IS_ACTIVE: "isActive",
  DISPLAY_ORDER: "displayOrder",
  LISTING_TYPE_VALUES: {
    STANDARD: "standard",
    AUCTION: "auction",
    PRE_ORDER: "pre-order",
    PRIZE_DRAW: "prize-draw",
    CLASSIFIED: "classified",
    DIGITAL_CODE: "digital-code",
    LIVE: "live",
    ART: "art",
    STICKERS: "stickers",
  },
} as const;

export const PRODUCT_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["published", "in_review"],
  published: ["draft", "archived"],
  in_review: ["published", "draft", "archived"],
  archived: ["draft"],
} as const;

// ============================================================================
// ORDER FIELDS
// ============================================================================

export const ORDER_FIELDS = {
  /** Word-prefix search tokens. Derived on write by `buildSearchTxtFor`. */
  SEARCH_TXT: "searchTxt",
  ID: "id",
  PRODUCT_ID: "productId",
  PRODUCT_TITLE: "productTitle",
  USER_ID: "userId",
  USER_NAME: "userName",
  USER_EMAIL: "userEmail",
  QUANTITY: "quantity",
  UNIT_PRICE: "unitPrice",
  TOTAL_PRICE: "totalPrice",
  CURRENCY: "currency",
  STATUS: "status",
  PAYMENT_STATUS: "paymentStatus",
  PAYMENT_ID: "paymentId",
  PAYMENT_METHOD: "paymentMethod",
  SHIPPING_ADDRESS: "shippingAddress",
  TRACKING_NUMBER: "trackingNumber",
  NOTES: "notes",
  ORDER_DATE: "orderDate",
  SHIPPING_DATE: "shippingDate",
  DELIVERY_DATE: "deliveryDate",
  CANCELLATION_DATE: "cancellationDate",
  CANCELLATION_REASON: "cancellationReason",
  REFUND_AMOUNT: "refundAmount",
  REFUND_STATUS: "refundStatus",
  PLATFORM_FEE: "platformFee",
  DEPOSIT_AMOUNT: "depositAmount",
  COD_REMAINING_AMOUNT: "codRemainingAmount",
  SHIPPING_FEE: "shippingFee",
  SELLER_ID: "sellerId",
  STORE_ID: "storeId",
  PAYOUT_STATUS: "payoutStatus",
  PAYOUT_ID: "payoutId",
  SHIPPING_METHOD: "shippingMethod",
  SHIPPING_CARRIER: "shippingCarrier",
  TRACKING_URL: "trackingUrl",
  ITEMS: "items",
  TOTAL_AMOUNT: "totalAmount",
  BUYER_ID: "buyerId",
  BUNDLE_ID: "bundleId",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  PAYMENT_DEADLINE: "paymentDeadline",
  PAYMENT_PROOF_URL: "paymentProofUrl",
  PAYMENT_PROOF_UPLOADED_AT: "paymentProofUploadedAt",
  PAYMENT_REVIEW_OUTCOME: "paymentReviewOutcome",
  PRIZE_WON: "prizeWon",
  PRIZE_DRAW_PRODUCT_ID: "prizeDrawProductId",
  PRIZE_REVEAL_MODE: "prizeRevealMode",

  STATUS_VALUES: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    RETURNED: "returned",
    RETURN_REQUESTED: "return_requested",
    REFUNDED: "refunded",
  },

  /*
   * Corrected 2026-08-24 (W3) — `processing` and `partial_refund` were
   * missing, so this listed 4 of the real 6. `PaymentStatus`
   * (features/orders/types/index.ts) is the source; a partial refund is a
   * state real orders reach, and W2 put it on the order timeline.
   */
  PAYMENT_STATUS_VALUES: {
    PENDING: "pending",
    PROCESSING: "processing",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
    PARTIAL_REFUND: "partial_refund",
  },

  PAYOUT_STATUS_VALUES: {
    ELIGIBLE: "eligible",
    REQUESTED: "requested",
    PAID: "paid",
  },

  SHIPPING_METHOD_VALUES: {
    CUSTOM: "custom",
  },
} as const;

// ============================================================================
// REVIEW FIELDS
// ============================================================================

export const REVIEW_FIELDS = {
  ID: "id",
  PRODUCT_ID: "productId",
  PRODUCT_TITLE: "productTitle",
  SELLER_ID: "sellerId",
  STORE_ID: "storeId",
  USER_ID: "userId",
  USER_NAME: "userName",
  USER_NAME_INDEX: "userNameIndex",
  USER_AVATAR: "userAvatar",
  BUYER_ID: "buyerId",
  RATING: "rating",
  TITLE: "title",
  BODY: "body",
  COMMENT: "comment",
  IMAGES: "images",
  VIDEO: "video",
  STATUS: "status",
  MODERATOR_ID: "moderatorId",
  MODERATOR_NOTE: "moderatorNote",
  REJECTION_REASON: "rejectionReason",
  HELPFUL_COUNT: "helpfulCount",
  REPORT_COUNT: "reportCount",
  VERIFIED: "verified",
  IS_VERIFIED_PURCHASE: "isVerifiedPurchase",
  FEATURED: "featured",
  SELLER_RESPONSE: "sellerResponse",
  PUBLISHED_AT: "publishedAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  APPROVED_AT: "approvedAt",
  REJECTED_AT: "rejectedAt",

  STATUS_VALUES: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
} as const;

// ============================================================================
// BID FIELDS
// ============================================================================

export const BID_FIELDS = {
  ID: "id",
  PRODUCT_ID: "productId",
  PRODUCT_TITLE: "productTitle",
  USER_ID: "userId",
  BIDDER_ID: "bidderId",
  USER_NAME: "userName",
  USER_EMAIL: "userEmail",
  BID_AMOUNT: "bidAmount",
  AMOUNT: "amount",
  CURRENCY: "currency",
  STATUS: "status",
  IS_WINNING: "isWinning",
  PREVIOUS_BID_AMOUNT: "previousBidAmount",
  BID_DATE: "bidDate",
  BID_TIME: "bidTime",
  AUTO_MAX_BID: "autoMaxBid",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  /*
   * Corrected 2026-08-24 (W3). Verified against the feature's own union AND
   * against what is actually stored. This file is a deliberate LEAF — it
   * imports nothing, and `features/products/types/index.ts` imports IT — so it
   * cannot re-export the feature unions without a cycle. The values are
   * therefore duplicated on purpose, and `audit-field-names-union-parity`
   * blocks them drifting again.
   */
  STATUS_VALUES: {
    ACTIVE: "active",
    OUTBID: "outbid",
    WON: "won",
    LOST: "lost",
    CANCELLED: "cancelled",
    /** Won, then the buyer let the payment window lapse. Was missing here. */
    FORFEITED: "forfeited",
  },
} as const;

// ============================================================================
// AD FIELDS
// ============================================================================

export const AD_FIELDS = {
  ID: "id",
  TITLE: "title",
  STATUS: "status",
  ORDER: "order",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  STATUS_VALUES: {
    DRAFT: "draft",
    ACTIVE: "active",
    SCHEDULED: "scheduled",
    PAUSED: "paused",
  },
} as const;

/**
 * The ad fields whose changes earn a `statusHistory` entry.
 *
 * Ads live inside the `siteSettings` singleton and have no repository, so
 * `withHistory` is called from the route directly — it is a pure function, so
 * that is fine. This list lives here beside `AD_FIELDS` rather than in a
 * schema module because ads have no schema module of their own.
 *
 * The scheduling dates are tracked alongside `status`: an ad silently
 * rescheduled reads on the timeline as the same kind of event as one paused.
 */
export const AD_TRACKED_FIELDS = ["status", "startAt", "endAt"] as const;

// ============================================================================
// EVENT FIELDS
// ============================================================================

export const EVENT_FIELDS = {
  ID: "id",
  TITLE: "title",
  SLUG: "slug",
  TYPE: "type",
  STATUS: "status",
  TAGS: "tags",
  STARTS_AT: "startsAt",
  ENDS_AT: "endsAt",
  CREATED_BY: "createdBy",
  STATS: "stats",
  // Raffle fields (SB9)
  HAS_RAFFLE: "hasRaffle",
  RAFFLE_TYPE: "raffleType",
  RAFFLE_TOP_N: "raffleTopN",
  RAFFLE_PRIZE: "rafflePrize",
  RAFFLE_PRIZE_COUPON_ID: "rafflePrizeCouponId",
  RAFFLE_GITHUB_FUNCTION_URL: "raffleGithubFunctionUrl",
  RAFFLE_WINNER_USER_ID: "raffleWinnerUserId",
  RAFFLE_WINNER_DISPLAY_NAME: "raffleWinnerDisplayName",
  RAFFLE_WINNER_ENTRY_ID: "raffleWinnerEntryId",
  RAFFLE_TRIGGERED_AT: "raffleTriggeredAt",
  RAFFLE_ENTRY_COUNT: "raffleEntryCount",
  // Spin wheel fields (SB9)
  SPIN_PRIZES: "spinPrizes",
  SPIN_MAX_PER_USER: "spinMaxPerUser",
  SPIN_WINDOW_START: "spinWindowStart",
  SPIN_WINDOW_END: "spinWindowEnd",
  // Guest participation toggle (2026-08-20)
  ALLOW_GUEST_PARTICIPATION: "allowGuestParticipation",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  /**
   * Mirrors the `EventStatus` union in `features/events/types/index.ts`, which
   * is the source of truth. A `PUBLISHED: "published"` entry lived here until
   * 2026-08-24 — `EventStatus` never had that value, so any filter built from
   * it matched zero rows forever. It had no consumers and was removed; verified
   * by grep before deleting (Root Cause #34).
   */
  STATUS_VALUES: {
    DRAFT: "draft",
    ACTIVE: "active",
    PAUSED: "paused",
    ENDED: "ended",
    CANCELLED: "cancelled",
  },

  /**
   * Mirrors the `EventType` union. `LOTTERY` was missing until 2026-08-24,
   * which is why `events-seed-data.ts` had to write `type: "lottery"` as a raw
   * string literal while every other row used this map.
   */
  TYPE_VALUES: {
    SALE: "sale",
    OFFER: "offer",
    POLL: "poll",
    SURVEY: "survey",
    FEEDBACK: "feedback",
    RAFFLE: "raffle",
    SPIN_WHEEL: "spin_wheel",
    LOTTERY: "lottery",
  },

  RAFFLE_TYPE_VALUES: {
    OPEN_RAFFLE: "open_raffle",
    TOP_N_SCORERS: "top_n_scorers",
    TOP_N_PARTICIPANTS: "top_n_participants",
    SPIN_WHEEL: "spin_wheel",
  },
} as const;

// ============================================================================
// EVENT ENTRY FIELDS
// ============================================================================

export const EVENT_ENTRY_FIELDS = {
  ID: "id",
  EVENT_ID: "eventId",
  USER_ID: "userId",
  USER_DISPLAY_NAME: "userDisplayName",
  USER_EMAIL: "userEmail",
  STATUS: "status",
  RAFFLE_ELIGIBLE: "raffleEligible",
  SPIN_USED: "spinUsed",
  SPIN_COUNT: "spinCount",
  SPIN_PRIZE_ID: "spinPrizeId",
  SPIN_PRIZE_COUPON_CODE: "spinPrizeCouponCode",
  SPIN_WON_AT: "spinWonAt",
  GUEST_IP_HASH: "guestIpHash",
  CREATED_AT: "createdAt",

  STATUS_VALUES: {
    CONFIRMED: "CONFIRMED",
    WAITLISTED: "WAITLISTED",
    CANCELLED: "CANCELLED",
  },
} as const;

// ============================================================================
// PAYOUT FIELDS
// ============================================================================

export const PAYOUT_FIELDS = {
  ID: "id",
  STORE_ID: "storeId",
  SELLER_ID: "sellerId",
  AMOUNT: "amount",
  NET_AMOUNT: "netAmount",
  PERIOD_START: "periodStart",
  PERIOD_END: "periodEnd",
  ORDERS_INCLUDED: "ordersIncluded",
  PAYMENT_METHOD: "paymentMethod",
  TRANSACTION_ID: "transactionId",
  STATUS: "status",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  /*
   * Corrected 2026-08-24 (W3) — `cancelled` was listed here and is NOT a
   * member of `PayoutStatus` (features/payments/schemas/firestore.ts:18,
   * pending|processing|paid|failed). A chip or badge keyed on it could only
   * ever match zero rows (Recurrent Root Cause #33).
   */
  STATUS_VALUES: {
    PENDING: "pending",
    PROCESSING: "processing",
    PAID: "paid",
    FAILED: "failed",
  },
} as const;

// ============================================================================
// STORE FIELDS
// ============================================================================

export const STORE_FIELDS = {
  ID: "id",
  OWNER_ID: "ownerId",
  STORE_NAME: "storeName",
  SLUG: "slug",
  STORE_SLUG: "storeSlug",
  STORE_CATEGORY: "storeCategory",
  DESCRIPTION: "storeDescription",
  LOGO_URL: "storeLogoURL",
  BANNER_URL: "storeBannerURL",
  STATUS: "status",
  IS_VERIFIED: "isVerified",
  IS_FEATURED: "isFeatured",
  IS_PUBLIC: "isPublic",
  ADMIN_NOTES: "adminNotes",
  SUSPENSION_REASON: "suspensionReason",
  CAPABILITIES: "capabilities",
  SHIPPING_CONFIG: "shippingConfig",
  PAYOUT_DETAILS: "payoutDetails",
  STATS: "stats",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  STATUS_VALUES: {
    ACTIVE: "active",
    PENDING: "pending",
    SUSPENDED: "suspended",
    REJECTED: "rejected",
  },

  STATS_FIELDS: {
    ITEMS_SOLD: "stats.itemsSold",
    AVERAGE_RATING: "stats.averageRating",
    TOTAL_REVIEWS: "stats.totalReviews",
    TOTAL_ORDERS: "stats.totalOrders",
    TOTAL_PRODUCTS: "stats.totalProducts",
  },
} as const;

// ============================================================================
// CATEGORY FIELDS
// ============================================================================

export const CATEGORY_FIELDS = {
  ID: "id",
  NAME: "name",
  SLUG: "slug",
  DESCRIPTION: "description",
  PARENT_CATEGORY: "parentCategory",
  PARENT_ID: "parentId",
  ROOT_ID: "rootId",
  TIER: "tier",
  PATH: "path",
  IS_LEAF: "isLeaf",
  IS_FEATURED: "isFeatured",
  SHOW_ON_HOMEPAGE: "showOnHomepage",
  ICON: "icon",
  ORDER: "order",
  DISPLAY_ORDER: "displayOrder",
  IS_ACTIVE: "isActive",
  // SB-UNI — categoryType discriminator (category/brand/sublisting/bundle)
  CATEGORY_TYPE: "categoryType",
  // Bundle-specific fields (SB3 + bundle-eligibility rules)
  BUNDLE_KIND: "bundleKind",
  BUNDLE_PRODUCT_IDS: "bundleProductIds",
  BUNDLE_ITEM_DETAILS: "bundleItemDetails",
  BUNDLE_STOCK_STATUS: "bundleStockStatus",
  BUNDLE_QUERY_RESOLVED_AT: "bundleQueryResolvedAt",
  BUNDLE_ORIGINAL_TOTAL: "bundleOriginalTotal",
  DISPLAY: "display",
  VIEW_COUNT: "viewCount",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  CATEGORY_TYPE_VALUES: {
    CATEGORY: "category",
    BRAND: "brand",
    SUBLISTING: "sublisting",
    BUNDLE: "bundle",
  },

  BUNDLE_STOCK_STATUS_VALUES: {
    AVAILABLE: "available",
    UNAVAILABLE: "unavailable",
  },
} as const;

// ============================================================================
// BLOG FIELDS
// ============================================================================

export const BLOG_FIELDS = {
  ID: "id",
  TITLE: "title",
  SLUG: "slug",
  CONTENT: "content",
  EXCERPT: "excerpt",
  COVER_IMAGE: "coverImage",
  AUTHOR_ID: "authorId",
  AUTHOR_NAME: "authorName",
  TAGS: "tags",
  CATEGORY: "category",
  STATUS: "status",
  IS_FEATURED: "isFeatured",
  PUBLISH_DATE: "publishDate",
  PUBLISHED_AT: "publishedAt",
  READ_TIME_MINUTES: "readTimeMinutes",
  VIEWS: "views",
  YOUTUBE_ID: "youtubeId",
  SEO_TITLE: "seoTitle",
  SEO_DESCRIPTION: "seoDescription",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  STATUS_VALUES: {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
  },
} as const;

// ============================================================================
// USER FIELDS
// ============================================================================

export const USER_FIELDS = {
  ID: "id",
  EMAIL: "email",
  DISPLAY_NAME: "displayName",
  ROLE: "role",
  DISABLED: "disabled",
  STORE_STATUS: "storeStatus",
  STORE_SLUG: "storeSlug",
  PHOTO_URL: "photoURL",
  BIO: "bio",
  PHONE_NUMBER: "phoneNumber",
  EMAIL_INDEX: "emailIndex",
  PHONE_INDEX: "phoneIndex",
  EMAIL_VERIFIED: "emailVerified",
  STATS: "stats",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  ROLE_VALUES: {
    USER: "user",
    SELLER: "seller",
    ADMIN: "admin",
    MODERATOR: "moderator",
    EMPLOYEE: "employee",
  },
} as const;

// ============================================================================
// ADDRESS FIELDS
// ============================================================================

export const ADDRESS_FIELDS = {
  ID: "id",
  OWNER_TYPE: "ownerType",
  OWNER_ID: "ownerId",
  LABEL: "label",
  FULL_NAME: "fullName",
  PHONE: "phone",
  ADDRESS_LINE1: "addressLine1",
  CITY: "city",
  STATE: "state",
  POSTAL_CODE: "postalCode",
  PINCODE: "pincode",
  COUNTRY: "country",
  IS_DEFAULT: "isDefault",
  IS_PICKUP_LOCATION: "isPickupLocation",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  OWNER_TYPE_VALUES: {
    USER: "user",
    STORE: "store",
  },
} as const;

// ============================================================================
// BRAND FIELDS
// ============================================================================

export const BRAND_FIELDS = {
  ID: "id",
  NAME: "name",
  SLUG: "slug",
  DESCRIPTION: "description",
  LOGO_URL: "logoURL",
  BANNER_URL: "bannerURL",
  WEBSITE: "website",
  COUNTRY: "country",
  FOUNDED: "founded",
  IS_ACTIVE: "isActive",
  DISPLAY_ORDER: "displayOrder",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

// ============================================================================
// CART FIELDS
// ============================================================================

export const CART_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  SESSION_ID: "sessionId",
  ITEMS: "items",
  UPDATED_AT: "updatedAt",
  CREATED_AT: "createdAt",
} as const;

// ============================================================================
// WISHLIST FIELDS
// ============================================================================

export const WISHLIST_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  ITEMS: "items",
  UPDATED_AT: "updatedAt",
} as const;

// ============================================================================
// HISTORY FIELDS
// ============================================================================

export const HISTORY_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  ITEMS: "items",
  UPDATED_AT: "updatedAt",
} as const;

// ============================================================================
// NOTIFICATION FIELDS
// ============================================================================

export const NOTIFICATION_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  TYPE: "type",
  TITLE: "title",
  BODY: "body",
  IS_READ: "isRead",
  ENTITY_ID: "entityId",
  ENTITY_TYPE: "entityType",
  CREATED_AT: "createdAt",
} as const;

// ============================================================================
// PAGE VIEW FIELDS
// ============================================================================

export const PAGE_VIEW_FIELDS = {
  ID: "id",
  DATE: "date",
  ENTITY_TYPE: "entityType",
  ENTITY_ID: "entityId",
  URL: "url",
  COUNT: "count",
  UPDATED_AT: "updatedAt",
} as const;

// ============================================================================
// SESSION FIELDS
// ============================================================================

export const SESSION_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  IS_ACTIVE: "isActive",
  EXPIRES_AT: "expiresAt",
  LAST_ACTIVITY: "lastActivity",
  DEVICE_INFO: "deviceInfo",
  LOCATION: "location",
  CREATED_AT: "createdAt",
} as const;

// ============================================================================
// COUPON USAGE FIELDS
// ============================================================================

export const COUPON_USAGE_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  COUPON_CODE: "couponCode",
  USAGE_COUNT: "usageCount",
  LAST_USED_AT: "lastUsedAt",
  ORDERS: "orders",
} as const;

// ============================================================================
// SCAMMER FIELDS
// ============================================================================

export const SCAMMER_FIELDS = {
  ID: "id",
  SCAM_TYPE: "scamType",
  PLATFORM: "platform",
  STATUS: "status",
  REPORTED_BY: "reportedBy",
  VERIFIED_BY: "verifiedBy",
  CREATED_AT: "createdAt",

  /*
   * Corrected 2026-08-24 (W3). Two defects: the real stored value is
   * `pending_review`, not `pending` (the seeded scammer profile stores
   * `pending_review`), and `removed` was missing entirely. Already flagged in
   * CLAUDE.md's Root Cause #34 and never actioned.
   */
  STATUS_VALUES: {
    PENDING_REVIEW: "pending_review",
    VERIFIED: "verified",
    REJECTED: "rejected",
    REMOVED: "removed",
  },
} as const;

// ============================================================================
// SUPPORT TICKET FIELDS
// ============================================================================

export const SUPPORT_TICKET_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  STORE_ID: "storeId",
  /** Word-prefix tokens over `subject` only — see the repository's hook. */
  SEARCH_TXT: "searchTxt",
  SUBJECT: "subject",
  CATEGORY: "category",
  STATUS: "status",
  PRIORITY: "priority",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  STATUS_VALUES: {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    WAITING_ON_USER: "waiting_on_user",
    RESOLVED: "resolved",
    CLOSED: "closed",
  },

  /*
   * Corrected 2026-08-24 (W3) — `medium` is not a member of
   * `TicketPriorityValues` (low|normal|high|urgent). `normal` is the
   * middle value.
   */
  PRIORITY_VALUES: {
    LOW: "low",
    NORMAL: "normal",
    HIGH: "high",
    URGENT: "urgent",
  },
} as const;

// ============================================================================
// CAROUSEL SLIDE FIELDS
// ============================================================================

export const CAROUSEL_FIELDS = {
  ID: "id",
  NAME: "name",
  TITLE: "title",
  ORDER: "order",
  ACTIVE: "active",
  MEDIA: "media",
  LINK: "link",
  MOBILE_MEDIA: "mobileMedia",
  CARDS: "cards",
  BACKGROUND: "background",
  STATS: "stats",
  STAT: {
    VIEWS: "stats.views",
    LAST_VIEWED: "stats.lastViewed",
  },
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  CREATED_BY: "createdBy",

  BACKGROUND_TYPE_VALUES: {
    IMAGE: "image",
    VIDEO: "video",
    COLOR: "color",
    GRADIENT: "gradient",
  },
} as const;

// ============================================================================
// COUPON FIELDS
// ============================================================================

export const COUPON_FIELDS = {
  ID: "id",
  CODE: "code",
  NAME: "name",
  DESCRIPTION: "description",
  TYPE: "type",
  SCOPE: "scope",
  SELLER_ID: "sellerId",
  STORE_ID: "storeId",
  STORE_SLUG: "storeSlug",
  APPLICABLE_TO_AUCTIONS: "applicableToAuctions",
  DISCOUNT: "discount",
  BXGY: "bxgy",
  TIERS: "tiers",
  USAGE: "usage",
  VALIDITY: "validity",
  RESTRICTIONS: "restrictions",
  CREATED_BY: "createdBy",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  STATS: "stats",

  TYPE_VALUES: {
    PERCENTAGE: "percentage",
    FIXED: "fixed",
    FREE_SHIPPING: "free_shipping",
    BUY_X_GET_Y: "buy_x_get_y",
  },

  SCOPE_VALUES: {
    ADMIN: "admin",
    SELLER: "seller",
  },

  USAGE_FIELDS: {
    TOTAL_LIMIT: "usage.totalLimit",
    PER_USER_LIMIT: "usage.perUserLimit",
    CURRENT_USAGE: "usage.currentUsage",
  },

  VALIDITY_FIELDS: {
    START_DATE: "validity.startDate",
    END_DATE: "validity.endDate",
    IS_ACTIVE: "validity.isActive",
  },
} as const;

// ============================================================================
// FAQ FIELDS
// ============================================================================

export const FAQ_FIELDS = {
  ID: "id",
  QUESTION: "question",
  ANSWER: "answer",
  ANSWER_TEXT: "answer.text",
  ANSWER_FORMAT: "answer.format",
  CATEGORY: "category",
  SHOW_ON_HOMEPAGE: "showOnHomepage",
  SHOW_IN_FOOTER: "showInFooter",
  IS_PINNED: "isPinned",
  ORDER: "order",
  PRIORITY: "priority",
  TAGS: "tags",
  SEARCH_TXT: "searchTxt",
  RELATED_FAQS: "relatedFAQs",
  USE_SITE_SETTINGS: "useSiteSettings",
  VARIABLES: "variables",
  STATS: "stats",
  STAT: {
    VIEWS: "stats.views",
    HELPFUL: "stats.helpful",
    NOT_HELPFUL: "stats.notHelpful",
    LAST_VIEWED: "stats.lastViewed",
  },
  SEO: "seo",
  SEO_FIELDS: {
    SLUG: "seo.slug",
    META_TITLE: "seo.metaTitle",
    META_DESCRIPTION: "seo.metaDescription",
  },
  IS_ACTIVE: "isActive",
  CREATED_BY: "createdBy",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  CATEGORY_VALUES: {
    ORDERS_PAYMENT: "orders_payment",
    SHIPPING_DELIVERY: "shipping_delivery",
    RETURNS_REFUNDS: "returns_refunds",
    PRODUCT_INFORMATION: "product_information",
    ACCOUNT_SECURITY: "account_security",
    TECHNICAL_SUPPORT: "technical_support",
    GENERAL: "general",
  },
} as const;

// ============================================================================
// HOMEPAGE SECTION FIELDS
// ============================================================================

export const HOMEPAGE_SECTION_FIELDS = {
  ID: "id",
  TYPE: "type",
  ORDER: "order",
  ENABLED: "enabled",
  CONFIG: "config",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  TYPE_VALUES: {
    WELCOME: "welcome",
    TRUST_INDICATORS: "trust-indicators",
    CATEGORIES: "categories",
    PRODUCTS: "products",
    AUCTIONS: "auctions",
    BANNER: "banner",
    FEATURES: "features",
    REVIEWS: "reviews",
    WHATSAPP_COMMUNITY: "whatsapp-community",
    FAQ: "faq",
    BLOG_ARTICLES: "blog-articles",
    NEWSLETTER: "newsletter",
  },
} as const;

// ============================================================================
// SITE SETTINGS FIELDS
// ============================================================================

export const SITE_SETTINGS_FIELDS = {
  ID: "id",
  SITE_NAME: "siteName",
  MOTTO: "motto",
  LOGO: "logo",
  BACKGROUND: "background",
  CONTACT: "contact",
  CONTACT_FIELDS: {
    EMAIL: "contact.email",
    PHONE: "contact.phone",
    ADDRESS: "contact.address",
    UPI_VPA: "contact.upiVpa",
    WHATSAPP: "contact.whatsappNumber",
  },
  PAYMENT: "payment",
  PAYMENT_FIELDS: {
    RAZORPAY_ENABLED: "payment.razorpayEnabled",
    UPI_MANUAL_ENABLED: "payment.upiManualEnabled",
    COD_ENABLED: "payment.codEnabled",
  },
  COMMISSIONS: "commissions",
  COMMISSION_FIELDS: {
    PLATFORM_FEE_PERCENT: "commissions.platformFeePercent",
    GST_PERCENT: "commissions.gstPercent",
    MINIMUM_TRANSACTION_FEE: "commissions.minimumTransactionFee",
    GATEWAY_FEE_PERCENT: "commissions.gatewayFeePercent",
    COD_DEPOSIT_PERCENT: "commissions.codDepositPercent",
    SELLER_SHIPPING_FIXED: "commissions.sellerShippingFixed",
    PLATFORM_SHIPPING_PERCENT: "commissions.platformShippingPercent",
    PLATFORM_SHIPPING_FIXED_MIN: "commissions.platformShippingFixedMin",
    PAYOUT_HOLD_DAYS: "commissions.payoutHoldDays",
    MIN_PAYOUT_AMOUNT: "commissions.minPayoutAmount",
  },
  SOCIAL_LINKS: "socialLinks",
  EMAIL_SETTINGS: "emailSettings",
  SEO: "seo",
  FEATURES: "features",
  // FEATURE_FLAGS / FEATURE_FLAGS_FIELDS were deleted 2026-08-29 along with the
  // group itself — 11 of its 14 keys had no reader anywhere. The survivors that
  // were never flags live under LISTINGS below; the two with real behaviour
  // moved to `payment.smsVerification` and `payment.adminCheckoutBypass`.
  LISTINGS: "listings",
  LISTINGS_FIELDS: {
    LISTING_TYPES: "listings.listingTypes",
    CATEGORY_TYPES: "listings.categoryTypes",
  },
  LEGAL_PAGES: "legalPages",
  SHIPPING: "shipping",
  RETURNS: "returns",
  FAQ: "faq",
  FAQ_VARIABLES: "faq.variables",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

// ============================================================================
// COMMON / SHARED FIELD NAMES
// ============================================================================

export const COMMON_FIELDS = {
  ID: "id",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  CREATED_BY: "createdBy",
  STATUS: "status",
  IS_ACTIVE: "isActive",
  ORDER: "order",
} as const;

// ============================================================================
// OAUTH STATE VALUES
// ============================================================================

export const OAUTH_STATE_VALUES = {
  PENDING: "pending",
  USED: "used",
  EXPIRED: "expired",
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const SCHEMA_DEFAULTS = {
  USER_ROLE: "user",
  CURRENCY: "INR",
  UNKNOWN_USER_AGENT: "Unknown",
  UNKNOWN_USER: "Unknown User",
  ANONYMOUS_USER: "Anonymous",
  DEFAULT_DISPLAY_NAME: "User",
  ADMIN_EMAIL: "admin@letitrip.in",
} as const;
