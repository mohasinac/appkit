/**
 * Cart Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants
 * for the cart feature.
 */

// -- Cart Document ------------------------------------------------------------
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { ListingType } from "../../products/types/index";

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
   * carts) and cart-side UI badges. Replaces the legacy `isAuctionWin`/`isPreOrder`
   * pair on the cart item.
   */
  // SB-UNI-F 2026-05-13 — Phase 2 union extension. Cart capability is
  // enforced by the action layer (capabilityFor / canAddToCart) — classified
  // and live are blocked at addToCart, digital-code is allowed.
  listingType: ListingType;
  /** True when item was added from an accepted Make-an-Offer */
  isOffer?: boolean;
  offerId?: string;
  /**
   * True when the line was created by auction settlement for the winning
   * bidder. Auctions are `canAddToCart: false` for user-initiated adds — this
   * line is written by the settlement job through the repository directly, and
   * is the ONLY way an auction reaches the cart.
   */
  isAuctionWin?: boolean;
  /** The auction product this win refers to (= productId, kept explicit). */
  auctionId?: string;
  /** The winning bid, so the resulting order can be linked back to it. */
  bidId?: string;
  /**
   * True when this auction line came from Buy Now rather than from settlement.
   *
   * The two are NOT interchangeable even though both sit in the auction lane:
   *  - a settlement line is a FINISHED auction — the item is already sold, the
   *    buyer owes it, and the 48h window costs nobody anything;
   *  - a buyout line is a CLAIM on an auction that is still live and still
   *    taking bids. The item is not sold yet; it becomes sold only when
   *    `claimAuctionForCheckout` commits at order time. Hence the 1h window,
   *    and hence a lapse that cancels the bid rather than forfeiting it —
   *    nothing was won, so nothing is forfeited, and the auction is untouched.
   */
  isBuyout?: boolean;
  /** Locked offer/winning-bid price — overrides normal product price at checkout */
  lockedPrice?: number;
  /**
   * When the claim on this locked price lapses. Mirrors the offer's own
   * `checkoutDeadline`; set to now + 48h for a won auction. The expiry sweep
   * clears lines past this point.
   */
  checkoutDeadline?: Date;
  /** When true the item cannot be removed or have its quantity changed. Set on won-auction and accepted-offer items that require mandatory payment. */
  locked?: boolean;
  /**
   * SB-UNI-4 2026-05-13 — bundle identifier when this cart line represents a
   * bundle (categoryType:"bundle" row on the categories collection). When set,
   * `productId` points at the bundle category's id, `price` is the locked
   * bundlePrice, and `bundleProductIds` snapshots the member product
   * ids at add-to-cart time. Order-side fan-out into per-product OrderItem
   * entries lands in S-SBUNI-5 (checkout-side stock decrement + per-store
   * grouping); until then the foundation is here but BundleDetailView keeps
   * the "Add to cart coming soon" notice up.
   */
  bundleCategorySlug?: string;
  /** Snapshot of `bundle.bundleProductIds` at add-to-cart time. */
  bundleProductIds?: string[];
  /**
   * S-SBUNI-RULES 2026-05-13 — buyer's chosen shipping provider for this
   * item, snapshotted at cart time. Locked at checkout; the per-tab
   * ShippingPicker writes this when the buyer selects a provider.
   */
  chosenShippingProviderId?: string;
  /** Fee in decimal rupees for the chosen provider, snapshotted at cart time. */
  chosenShippingFee?: number;
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
}

/**
 * Paid add-ons the buyer opted into, for ONE store.
 *
 * Add-on fees have always been billed per order group (= per store) by
 * `createOrderForGroup` / `previewCheckoutPricing`, but the selection used to be
 * a single cart-wide boolean — so one tick on "WhatsApp updates" quietly billed
 * ₹10 × every store in the cart, with no way to opt in for just one seller.
 * Keying the selection by storeId makes the choice match the billing.
 */
export interface CartStoreAddons {
  whatsappNotifyAddon?: boolean;
  giftWrapAddon?: boolean;
  giftWrapMessage?: string;
  shipmentProtectionAddon?: boolean;
}

export interface CartDocument extends BaseDocument {
  userId: string;
  items: CartItemDocument[];
  /** Multiple coupons/deals applied at cart level */
  appliedCoupons?: CartAppliedCoupon[];
  /** Item IDs the user has selected for the next checkout (undefined = all items) */
  selectedItemIds?: string[];
  /**
   * Per-store add-on selections, keyed by `storeId` — the same key
   * `splitCartIntoOrderGroups` groups on.
   *
   * This map is the source of truth for what gets charged; the checkout request
   * no longer carries addon booleans. A store with no selected items forms no
   * order group, so its entry is simply never read — that is what makes
   * "only charge a store whose items are actually checking out" structural
   * rather than a flag someone has to remember to check.
   */
  storeAddons?: Record<string, CartStoreAddons>;
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
  // SB-UNI-F 2026-05-13 — Phase 2 union extension. Cart capability is
  // enforced by the action layer (capabilityFor / canAddToCart) — classified
  // and live are blocked at addToCart, digital-code is allowed.
  listingType: ListingType;
  isOffer?: boolean;
  offerId?: string;
  isAuctionWin?: boolean;
  auctionId?: string;
  bidId?: string;
  /** See `CartItemDocument.isBuyout` — a claim on a live auction, not a win. */
  isBuyout?: boolean;
  lockedPrice?: number;
  checkoutDeadline?: Date;
  locked?: boolean;
  /** SB-UNI-4 2026-05-13 — bundle identifier when the line is a bundle. */
  bundleCategorySlug?: string;
  /** Snapshot of bundle members at add-to-cart time. */
  bundleProductIds?: string[];
};

export type UpdateCartItemInput = {
  quantity: number;
};

export const cartQueryHelpers = {
  byUserId: (userId: string) => ({ field: CART_FIELDS.USER_ID, value: userId }),
} as const;
