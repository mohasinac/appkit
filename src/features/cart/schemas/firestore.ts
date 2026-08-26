/**
 * Cart Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants
 * for the cart feature.
 */

// -- Cart Document ------------------------------------------------------------
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { ListingType } from "../../products/types/index";

/**
 * What KIND of thing one cart line represents.
 *
 *  - absent      — an ordinary single-product line.
 *  - `"bundle"`  — a fixed, all-or-nothing set priced as a whole
 *                  (`categoryType:"bundle"` row on `categories`). Members are
 *                  not pickable; the only stepper is the line-level one and it
 *                  means COPIES OF THE BUNDLE.
 *  - `"group"`   — a buyer-assembled selection out of a product group
 *                  (`product.groupId`) or a `groupedListings` doc. Members ARE
 *                  pickable; there is no line-level stepper.
 */
export type CartLineKind = "bundle" | "group";

/** Which collection a `"group"` line's members were picked from. */
export type CartGroupSource = "product-group" | "grouped-listing";

/**
 * One member product inside a multi-member cart line.
 *
 * 🛑 THE QUANTITY INVARIANT — every reader and writer depends on it:
 *
 *   `CartItemDocument.quantity` = copies of the whole selection
 *   `CartLineMember.quantity`   = units of THIS member per copy
 *   demand for a product        = item.quantity × member.quantity
 *
 * A `"group"` line pins `item.quantity` to 1, which is what lets `unitPriceFor`
 * keep returning a UNIT price that every existing call site multiplies by
 * `item.quantity` without double-counting. A `"bundle"` line is the mirror
 * image: `item.quantity` is the editable one and member quantities are frozen
 * at add time.
 *
 * Prices/titles/images are SNAPSHOTS taken server-side at add time. They are
 * never accepted from the client — see `POST /api/cart/group`, which takes ids
 * and quantities only.
 */
export interface CartLineMember {
  productId: string;
  /** Units of this member per copy of the line. See the invariant above. */
  quantity: number;
  /** Snapshot of the member's own price at add time, in decimal rupees. */
  unitPrice: number;
  title: string;
  image?: string;
  /** Snapshot for per-member GST proration at checkout (`lineTaxComponentsFor`). */
  gstRate?: number;
  hsnCode?: string;
  listingType?: ListingType;
}

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
   * `productId` points at the bundle category's id and `price` is the locked
   * bundlePrice.
   *
   * This is an IDENTITY, not a mirror — it is what the order-side collapse key
   * (`groupOrderItemsByLine`) groups on, and it keeps being written.
   */
  bundleCategorySlug?: string;
  /**
   * @deprecated Legacy carts only. Superseded by `groupMembers`, which can
   * express per-member quantities where a bare id array cannot.
   *
   * Do NOT write this from new code and do NOT read it directly — a
   * hand-maintained mirror alongside `groupMembers` is exactly the drift
   * Recurrent Root Cause #42 describes. Read through `getCartLineMembers()`
   * (`_internal/server/features/checkout/bundle-expansion.ts`), which falls
   * back to these ids at quantity 1 so lines written before `groupMembers`
   * existed keep behaving byte-identically.
   */
  bundleProductIds?: string[];
  /**
   * Discriminator for a multi-member line. Absent on an ordinary
   * single-product line. See `CartLineKind` for the two behaviours.
   */
  lineKind?: CartLineKind;
  /** Which collection the members came from. `"group"` lines only. */
  groupSource?: CartGroupSource;
  /** `product.groupId` | `groupedListing.id` | the bundle category's id. */
  groupId?: string;
  /** Slug for the line's detail href. Bundles use `bundleCategorySlug` instead. */
  groupSlug?: string;
  /** Display snapshot of the group/bundle name. */
  groupTitle?: string;
  /**
   * The members of a multi-member line, AUTHORITATIVE over `bundleProductIds`.
   * See `CartLineMember` for the quantity invariant.
   *
   * `price` on this document is derived from this array by the repository
   * (`deriveLinePrice`) at every write, never set by a caller — so no caller
   * can forget to keep the two in step.
   */
  groupMembers?: CartLineMember[];
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
    IS_OFFER: "isOffer",
    OFFER_ID: "offerId",
    IS_AUCTION_WIN: "isAuctionWin",
    AUCTION_ID: "auctionId",
    BID_ID: "bidId",
    IS_BUYOUT: "isBuyout",
    LOCKED_PRICE: "lockedPrice",
    CHECKOUT_DEADLINE: "checkoutDeadline",
    LOCKED: "locked",
    BUNDLE_CATEGORY_SLUG: "bundleCategorySlug",
    /** @deprecated legacy read path — see CartItemDocument.bundleProductIds */
    BUNDLE_PRODUCT_IDS: "bundleProductIds",
    LINE_KIND: "lineKind",
    GROUP_SOURCE: "groupSource",
    GROUP_ID: "groupId",
    GROUP_SLUG: "groupSlug",
    GROUP_TITLE: "groupTitle",
    GROUP_MEMBERS: "groupMembers",
    CHOSEN_SHIPPING_PROVIDER_ID: "chosenShippingProviderId",
    CHOSEN_SHIPPING_FEE: "chosenShippingFee",
    ADDED_AT: "addedAt",
    UPDATED_AT: "updatedAt",
  },
} as const;

export const CART_LINE_KIND_VALUES = ["bundle", "group"] as const;
export const CART_GROUP_SOURCE_VALUES = ["product-group", "grouped-listing"] as const;

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
  /** @deprecated Legacy only — write `groupMembers` instead. */
  bundleProductIds?: string[];
  lineKind?: CartLineKind;
  groupSource?: CartGroupSource;
  groupId?: string;
  groupSlug?: string;
  groupTitle?: string;
  groupMembers?: CartLineMember[];
};

/**
 * Input for creating a multi-member line. `price` is deliberately absent — the
 * repository derives it from `groupMembers` so the two can never disagree.
 */
export type AddGroupLineInput = Omit<AddToCartInput, "price" | "groupMembers"> & {
  groupMembers: CartLineMember[];
};

export type UpdateCartItemInput = {
  quantity: number;
};

/**
 * Body of a per-member edit. The WHOLE array is sent, not a delta: the cart is
 * a single Firestore document written with `set()`, so N per-member writes
 * would be both a Rule #6 cost and a real lost-update race on a double-click.
 */
export type UpdateCartGroupMembersInput = {
  groupMembers: Array<{ productId: string; quantity: number }>;
};

export const cartQueryHelpers = {
  byUserId: (userId: string) => ({ field: CART_FIELDS.USER_ID, value: userId }),
} as const;
