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
// PRODUCT FIELDS
// ============================================================================

export const PRODUCT_FIELDS = {
  ID: "id",
  TITLE: "title",
  DESCRIPTION: "description",
  SLUG: "slug",
  CATEGORY: "category",
  CATEGORY_SLUG: "categorySlug",
  SUBCATEGORY: "subcategory",
  BRAND: "brand",
  BRAND_SLUG: "brandSlug",
  PRICE: "price",
  CURRENCY: "currency",
  STOCK_QUANTITY: "stockQuantity",
  AVAILABLE_QUANTITY: "availableQuantity",
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
  PRIZE_REVEAL_DEADLINE: "prizeRevealDeadline",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  STATUS_VALUES: {
    DRAFT: "draft",
    PUBLISHED: "published",
    OUT_OF_STOCK: "out_of_stock",
    DISCONTINUED: "discontinued",
    SOLD: "sold",
  },

  CONDITION_VALUES: {
    NEW: "new",
    USED: "used",
    REFURBISHED: "refurbished",
    BROKEN: "broken",
  },

  SHIPPING_PAID_BY_VALUES: {
    SELLER: "seller",
    BUYER: "buyer",
  },

  AUCTION_SHIPPING_PAID_BY_VALUES: {
    SELLER: "seller",
    WINNER: "winner",
  },

  PRE_ORDER_PRODUCTION_STATUS_VALUES: {
    IN_PRODUCTION: "in_production",
    READY: "ready",
    DELAYED: "delayed",
    CANCELLED: "cancelled",
  },

  PRIZE_REVEAL_STATUS_VALUES: {
    PENDING: "pending",
    OPEN: "open",
    CLOSED: "closed",
  },

  LISTING_TYPE_VALUES: {
    STANDARD: "standard",
    AUCTION: "auction",
    PRE_ORDER: "pre-order",
    PRIZE_DRAW: "prize-draw",
    BUNDLE: "bundle",
  },
} as const;

export const PRODUCT_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["published", "discontinued"],
  published: ["draft", "out_of_stock", "discontinued"],
  out_of_stock: ["published", "draft", "discontinued"],
  sold: ["discontinued"],
  discontinued: ["draft"],
} as const;

// ============================================================================
// ORDER FIELDS
// ============================================================================

export const ORDER_FIELDS = {
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
  SHIPROCKET_ORDER_ID: "shiprocketOrderId",
  SHIPROCKET_SHIPMENT_ID: "shiprocketShipmentId",
  SHIPROCKET_AWB: "shiprocketAWB",
  SHIPROCKET_STATUS: "shiprocketStatus",
  SHIPROCKET_UPDATED_AT: "shiprocketUpdatedAt",
  ITEMS: "items",
  TOTAL_AMOUNT: "totalAmount",
  BUYER_ID: "buyerId",
  BUNDLE_ID: "bundleId",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

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

  PAYMENT_STATUS_VALUES: {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
  },

  PAYOUT_STATUS_VALUES: {
    ELIGIBLE: "eligible",
    REQUESTED: "requested",
    PAID: "paid",
  },

  SHIPPING_METHOD_VALUES: {
    CUSTOM: "custom",
    SHIPROCKET: "shiprocket",
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

  STATUS_VALUES: {
    ACTIVE: "active",
    OUTBID: "outbid",
    WON: "won",
    LOST: "lost",
    CANCELLED: "cancelled",
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
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  STATUS_VALUES: {
    DRAFT: "draft",
    PUBLISHED: "published",
    ACTIVE: "active",
    ENDED: "ended",
    CANCELLED: "cancelled",
    PAUSED: "paused",
  },

  TYPE_VALUES: {
    SALE: "sale",
    OFFER: "offer",
    POLL: "poll",
    SURVEY: "survey",
    FEEDBACK: "feedback",
    RAFFLE: "raffle",
    SPIN_WHEEL: "spin_wheel",
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
  SPIN_PRIZE_ID: "spinPrizeId",
  SPIN_PRIZE_COUPON_CODE: "spinPrizeCouponCode",
  SPIN_WON_AT: "spinWonAt",
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

  STATUS_VALUES: {
    PENDING: "pending",
    PROCESSING: "processing",
    PAID: "paid",
    FAILED: "failed",
    CANCELLED: "cancelled",
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
  IS_PUBLIC: "isPublic",
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
  DISPLAY_ORDER: "displayOrder",
  IS_ACTIVE: "isActive",
  // SB-UNI — categoryType discriminator (category/brand/sublisting/bundle)
  CATEGORY_TYPE: "categoryType",
  // Bundle-specific fields (SB3)
  BUNDLE_PRODUCT_IDS: "bundleProductIds",
  BUNDLE_STOCK_STATUS: "bundleStockStatus",
  BUNDLE_QUERY_RESOLVED_AT: "bundleQueryResolvedAt",
  DISPLAY: "display",
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
// CONVERSATION FIELDS
// ============================================================================

export const CONVERSATION_FIELDS = {
  ID: "id",
  BUYER_ID: "buyerId",
  STORE_ID: "storeId",
  LAST_MESSAGE_AT: "lastMessageAt",
  LAST_MESSAGE: "lastMessage",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
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

  STATUS_VALUES: {
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected",
  },
} as const;

// ============================================================================
// SUPPORT TICKET FIELDS
// ============================================================================

export const SUPPORT_TICKET_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  STORE_ID: "storeId",
  SUBJECT: "subject",
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

  PRIORITY_VALUES: {
    LOW: "low",
    NORMAL: "normal",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
  },
} as const;

// ============================================================================
// CAROUSEL SLIDE FIELDS
// ============================================================================

export const CAROUSEL_FIELDS = {
  ID: "id",
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
  SEARCH_TOKENS: "searchTokens",
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
    RAZORPAY_FEE_PERCENT: "commissions.razorpayFeePercent",
    COD_DEPOSIT_PERCENT: "commissions.codDepositPercent",
    SELLER_SHIPPING_FIXED: "commissions.sellerShippingFixed",
    PLATFORM_SHIPPING_PERCENT: "commissions.platformShippingPercent",
    PLATFORM_SHIPPING_FIXED_MIN: "commissions.platformShippingFixedMin",
  },
  SOCIAL_LINKS: "socialLinks",
  EMAIL_SETTINGS: "emailSettings",
  SEO: "seo",
  FEATURES: "features",
  FEATURE_FLAGS: "featureFlags",
  FEATURE_FLAGS_FIELDS: {
    CHATS: "featureFlags.chats",
    SMS_VERIFICATION: "featureFlags.smsVerification",
    TRANSLATIONS: "featureFlags.translations",
    WISHLISTS: "featureFlags.wishlists",
    AUCTIONS: "featureFlags.auctions",
    REVIEWS: "featureFlags.reviews",
    EVENTS: "featureFlags.events",
    BLOG: "featureFlags.blog",
    COUPONS: "featureFlags.coupons",
    NOTIFICATIONS: "featureFlags.notifications",
    SELLER_REGISTRATION: "featureFlags.sellerRegistration",
    PRE_ORDERS: "featureFlags.preOrders",
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
