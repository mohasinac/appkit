/**
 * Cart Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants
 * for the cart feature.
 */

// -- Cart Document ------------------------------------------------------------

export interface CartItemDocument {
  itemId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  currency: string;
  quantity: number;
  /** Store slug (= storeId = store.id) used for order grouping and store link (/stores/[storeId]) */
  storeId: string;
  storeName: string;
  /**
   * Snapshot of the product's listing-kind at add-to-cart time (SB1-G Phase 4).
   * Drives order-grouping (auctions/pre-orders settle separately from standard
   * carts) and cart-side UI badges. Replaces the legacy `isAuction`/`isPreOrder`
   * pair on the cart item.
   */
  listingType: "standard" | "auction" | "pre-order" | "prize-draw" | "bundle";
  /** True when item was added from an accepted Make-an-Offer */
  isOffer?: boolean;
  offerId?: string;
  /** Locked offer price — overrides normal product price at checkout */
  lockedPrice?: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface CartAppliedCoupon {
  code: string;
  discountAmount: number;
  couponId?: string;
  /** "admin" coupons apply across all stores; "seller" coupons apply to one store's items */
  scope?: "admin" | "seller";
  /** For seller-scoped coupons, the storeId whose items this applies to */
  storeId?: string;
  /** Item IDs (CartItemDocument.itemId) this coupon was calculated against */
  applicableItemIds?: string[];
  /** Mirrors CouponDocument.restrictions.combineWithSellerCoupons — used for conflict detection when adding future coupons */
  combineWithSellerCoupons?: boolean;
}

export interface CartDocument {
  id: string; // = userId
  userId: string;
  items: CartItemDocument[];
  /** Multiple coupons/deals applied at cart level */
  appliedCoupons?: CartAppliedCoupon[];
  /** Item IDs the user has selected for the next checkout (undefined = all items) */
  selectedItemIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const CART_COLLECTION = "carts" as const;

export const CART_INDEXED_FIELDS: string[] = ["userId"];

export const CART_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  ITEMS: "items",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",

  ITEM: {
    ITEM_ID: "itemId",
    PRODUCT_ID: "productId",
    PRODUCT_TITLE: "productTitle",
    PRODUCT_IMAGE: "productImage",
    PRICE: "price",
    CURRENCY: "currency",
    QUANTITY: "quantity",
    STORE_ID: "storeId",
    STORE_NAME: "storeName",
    LISTING_TYPE: "listingType",
    ADDED_AT: "addedAt",
    UPDATED_AT: "updatedAt",
  },
} as const;

export const DEFAULT_CART_DATA: Partial<CartDocument> = {
  items: [],
};

export type CartCreateInput = Omit<
  CartDocument,
  "id" | "createdAt" | "updatedAt"
>;

export type AddToCartInput = {
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  currency: string;
  quantity: number;
  /** Store slug (= storeId = store.id) */
  storeId: string;
  storeName: string;
  listingType: "standard" | "auction" | "pre-order" | "prize-draw" | "bundle";
  isOffer?: boolean;
  offerId?: string;
  lockedPrice?: number;
};

export type UpdateCartItemInput = {
  quantity: number;
};

export const cartQueryHelpers = {
  byUserId: (userId: string) => ({ field: CART_FIELDS.USER_ID, value: userId }),
} as const;
