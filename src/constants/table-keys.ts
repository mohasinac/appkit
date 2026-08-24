/** Keys used with useUrlTable.get() / useUrlTable.set() */
export const TABLE_KEYS = {
  VIEW: "view",
  SORT: "sort",
  PAGE: "page",
  PAGE_SIZE: "pageSize",
  TAB: "tab",
  /** Open section(s) of a `<SectionForm>`. Non-resetting — see NON_RESETTING_KEYS. */
  SECTION: "section",
  QUERY: "q",
  STATUS: "status",
  CATEGORY: "category",
  BRAND: "brand",
  MIN_PRICE: "minPrice",
  MAX_PRICE: "maxPrice",
  CONDITION: "condition",
  STORE_ID: "storeId",
  SELLER: "seller",
  TAGS: "tags",
  DATE_FROM: "dateFrom",
  DATE_TO: "dateTo",
  /**
   * Three-state availability tab on every listing surface, public and
   * dashboard: "available" (default) | "unavailable" | "all". Replaces the
   * SHOW_SOLD/SHOW_ENDED/SHOW_CLOSED toggle trio below, which widened the
   * list instead of scoping it and had three spellings of one intent.
   */
  AVAILABILITY: "availability",
  /** Order lifecycle scope tab: "active" | "closed" | "all". */
  ORDER_SCOPE: "orderScope",
  /**
   * Superseded by AVAILABILITY. Retained ONLY so `readAvailability()` can map
   * bookmarked `?showSold=true` URLs onto `availability=all`, and because the
   * seller auction/prize-draw dashboards still read them during migration.
   * Never write these from new code.
   */
  SHOW_SOLD: "showSold",
  SHOW_ENDED: "showEnded",
  SHOW_CLOSED: "showClosed",
  FEATURED: "featured",
  IS_FEATURED: "isFeatured",
  AUCTION_ID: "auctionId",
  BIDDER_ID: "bidderId",
  STORE_NAME: "storeName",
  LISTING_TYPE: "listingType",
  IN_STOCK: "inStock",
  FREE_SHIPPING: "freeShipping",
  RATING: "rating",
  MIN_BID: "minBid",
  MAX_BID: "maxBid",
  SHOW_EXPIRED: "showExpired",
  PREORDER_STATUS: "preOrderProductionStatus",
  PRIZE_REVEAL_STATUS: "prizeRevealStatus",
  PAYOUT_STATUS: "payoutStatus",
  CATEGORY_SLUG: "categorySlug",
  SHOW_UNREAD: "showUnread",
  TYPE: "type",
  IS_PART_OF_BUNDLE: "isPartOfBundle",
  SUBLISTING_CATEGORY: "sublistingCategory",
  FEATURES: "features",
  // Classified-specific
  CITY: "city",
  ACCEPTS_SHIPPING: "acceptsShipping",
  NEGOTIABLE: "negotiable",
  // Digital-code-specific
  DELIVERY_METHOD: "deliveryMethod",
  // Live-item-specific
  SPECIES: "species",
  JURISDICTION: "jurisdiction",
  LIVE_SEX: "liveSex",
  LIVE_TRANSPORT_METHOD: "liveTransportMethod",
} as const;

export type TableKey = (typeof TABLE_KEYS)[keyof typeof TABLE_KEYS];

export const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
  TABLE: "table",
} as const;

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];
