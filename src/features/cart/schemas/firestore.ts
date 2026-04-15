/**
 * Cart Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants
 * for the cart feature.
 */

// ── Cart Document ────────────────────────────────────────────────────────────

export interface CartItemDocument {
  itemId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  currency: string;
  quantity: number;
  sellerId: string;
  sellerName: string;
  isAuction: boolean;
  isPreOrder: boolean;
  /** True when item was added from an accepted Make-an-Offer */
  isOffer?: boolean;
  offerId?: string;
  /** Locked offer price — overrides normal product price at checkout */
  lockedPrice?: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface CartDocument {
  id: string; // = userId
  userId: string;
  items: CartItemDocument[];
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
    SELLER_ID: "sellerId",
    SELLER_NAME: "sellerName",
    IS_AUCTION: "isAuction",
    IS_PRE_ORDER: "isPreOrder",
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
  sellerId: string;
  sellerName: string;
  isAuction?: boolean;
  isPreOrder?: boolean;
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
