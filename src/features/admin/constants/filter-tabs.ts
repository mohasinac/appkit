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
