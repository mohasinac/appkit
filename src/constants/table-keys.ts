/** Keys used with useUrlTable.get() / useUrlTable.set() */
export const TABLE_KEYS = {
  VIEW: "view",
  SORT: "sort",
  PAGE: "page",
  PAGE_SIZE: "pageSize",
  TAB: "tab",
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
} as const;

export type TableKey = (typeof TABLE_KEYS)[keyof typeof TABLE_KEYS];

export const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
  TABLE: "table",
} as const;

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];
