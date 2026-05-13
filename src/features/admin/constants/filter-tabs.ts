/**
 * Admin filter-chip tab sets (SB10-C completion, S8 2026-05-13).
 *
 * Match current view-filter values exactly so migrating an inline
 * `STATUS_OPTIONS` array to one of these constants is a behaviour-preserving
 * rename. The `ALL_TAB` sentinel collapses to an empty filter string when
 * clicked.
 *
 * Each entry is a typed `{ id, label }` row so views render with one
 * primitive and stay in sync when statuses are added.
 */

export interface AdminFilterTab {
  /** Filter value — empty when `id === "All"`. */
  id: string;
  /** Display text. */
  label: string;
}

export const ALL_TAB = { id: "All", label: "All" } as const;

/** Admin > Products — listing status filter chip set. */
export const ADMIN_PRODUCT_STATUS_TABS = [
  ALL_TAB,
  { id: "pending", label: "Pending" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Products — listing-type filter chip set. Legacy label-as-id IDs
 *  preserved so the existing Sieve filter values keep matching. */
export const ADMIN_PRODUCT_LISTING_TYPE_TABS = [
  ALL_TAB,
  { id: "Products", label: "Products" },
  { id: "Auctions", label: "Auctions" },
  { id: "Pre-orders", label: "Pre-orders" },
  { id: "Prize Draws", label: "Prize Draws" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Blog — post status filter chip set. */
export const ADMIN_BLOG_STATUS_TABS = [
  ALL_TAB,
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Users — account-state filter chip set. */
export const ADMIN_USER_STATUS_TABS = [
  ALL_TAB,
  { id: "Active", label: "Active" },
  { id: "Disabled", label: "Disabled" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Users — role filter chip set. */
export const ADMIN_USER_ROLE_TABS = [
  ALL_TAB,
  { id: "admin", label: "Admin" },
  { id: "seller", label: "Seller" },
  { id: "buyer", label: "Buyer" },
  { id: "moderator", label: "Moderator" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Stores — seller-onboarding state filter chip set. */
export const ADMIN_STORE_STATUS_TABS = [
  ALL_TAB,
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
  { id: "rejected", label: "Rejected" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Payouts — payout state filter chip set. Uppercase IDs match the
 *  `PayoutDocument.status` enum on the server. */
export const ADMIN_PAYOUT_STATUS_TABS = [
  ALL_TAB,
  { id: "PENDING", label: "Pending" },
  { id: "PROCESSING", label: "Processing" },
  { id: "PAID", label: "Paid" },
  { id: "FAILED", label: "Failed" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Orders — order-state filter chip set. Uppercase IDs match the
 *  `OrderDocument.status` enum on the server. */
export const ADMIN_ORDER_STATUS_TABS = [
  ALL_TAB,
  { id: "PENDING", label: "Pending" },
  { id: "PROCESSING", label: "Processing" },
  { id: "SHIPPED", label: "Shipped" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "REFUNDED", label: "Refunded" },
  { id: "RETURN_REQUESTED", label: "Return Requested" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Reviews — moderation state filter chip set. */
export const ADMIN_REVIEW_STATUS_TABS = [
  ALL_TAB,
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "rejected", label: "Rejected" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Reviews — star-rating filter chip set. */
export const ADMIN_REVIEW_RATING_TABS = [
  ALL_TAB,
  { id: "5", label: "5★" },
  { id: "4", label: "4★" },
  { id: "3", label: "3★" },
  { id: "2", label: "2★" },
  { id: "1", label: "1★" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Bids — bid-state filter chip set. */
export const ADMIN_BID_STATUS_TABS = [
  ALL_TAB,
  { id: "active", label: "Active" },
  { id: "outbid", label: "Outbid" },
  { id: "won", label: "Won" },
  { id: "cancelled", label: "Cancelled" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Contact — submission triage state filter chip set. */
export const ADMIN_CONTACT_STATUS_TABS = [
  ALL_TAB,
  { id: "new", label: "New" },
  { id: "read", label: "Read" },
  { id: "resolved", label: "Resolved" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Newsletter — subscription state filter chip set. */
export const ADMIN_NEWSLETTER_STATUS_TABS = [
  ALL_TAB,
  { id: "active", label: "Active" },
  { id: "unsubscribed", label: "Unsubscribed" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Event Entries — entry-state filter chip set. Uppercase IDs match
 *  the canonical `EventEntryDocument.status` enum. */
export const ADMIN_EVENT_ENTRY_STATUS_TABS = [
  ALL_TAB,
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "WAITLISTED", label: "Waitlisted" },
  { id: "CANCELLED", label: "Cancelled" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Events — event-state filter chip set. */
export const ADMIN_EVENT_STATUS_TABS = [
  ALL_TAB,
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
  { id: "active", label: "Active" },
  { id: "ended", label: "Ended" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Carts — cart-ownership filter chip set. */
export const ADMIN_CART_OWNERSHIP_TABS = [
  ALL_TAB,
  { id: "guest", label: "Guest" },
  { id: "auth", label: "Authenticated" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Coupons — coupon-type filter chip set. Matches the
 *  `CouponDocument.type` discriminator. */
export const ADMIN_COUPON_TYPE_TABS = [
  ALL_TAB,
  { id: "percentage", label: "Percentage" },
  { id: "fixed", label: "Fixed" },
  { id: "free_shipping", label: "Free Shipping" },
  { id: "buy_x_get_y", label: "Buy X Get Y" },
] as const satisfies readonly AdminFilterTab[];

// ---------------------------------------------------------------------------
// Seller-dashboard filter-chip tab sets
// ---------------------------------------------------------------------------

/** Empty-sentinel variant for views (like SellerBidsView) that drive the
 *  filter URL with `""` instead of `"All"` so the `"" == no filter` invariant
 *  stays a single shape across queries. */
export const EMPTY_TAB = { id: "", label: "All" } as const;

/** Seller > Products — listing-state filter chip set. */
export const SELLER_PRODUCT_STATUS_TABS = [
  ALL_TAB,
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
  { id: "sold", label: "Sold" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Auctions — auction-state filter chip set. */
export const SELLER_AUCTION_STATUS_TABS = [
  ALL_TAB,
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "ended", label: "Ended" },
  { id: "cancelled", label: "Cancelled" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Orders — order-state filter chip set. Subset of
 *  `ADMIN_ORDER_STATUS_TABS` — sellers don't see `RETURN_REQUESTED` until
 *  the buyer initiates one through support. */
export const SELLER_ORDER_STATUS_TABS = [
  ALL_TAB,
  { id: "PENDING", label: "Pending" },
  { id: "PROCESSING", label: "Processing" },
  { id: "SHIPPED", label: "Shipped" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "REFUNDED", label: "Refunded" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Offers — offer-state filter chip set. */
export const SELLER_OFFER_STATUS_TABS = [
  ALL_TAB,
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Rejected" },
  { id: "expired", label: "Expired" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Bids — bid-state filter chip set. Uses the empty-sentinel
 *  variant (see `EMPTY_TAB`). */
export const SELLER_BID_STATUS_TABS = [
  EMPTY_TAB,
  { id: "active", label: "Active" },
  { id: "outbid", label: "Outbid" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "cancelled", label: "Cancelled" },
] as const satisfies readonly AdminFilterTab[];
