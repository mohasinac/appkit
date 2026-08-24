
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
  /** Filter value — empty when sieveFilter("id", SIEVE_OP.EQ, "= "All""). */
  id: string;
  /** Display text. */
  label: string;
}

export const ALL_TAB = { id: "All", label: "All" } as const;

// COVERAGE (2026-08-24): `audit-filter-tab-enums` gained a check that every
// value of the backing enum HAS a chip, not just that every chip is a real
// value. It immediately found ten gaps across the seller sets — `in_review`
// (where a submission waits on admin approval, arguably the state a seller most
// wants to filter for), `archived`, `returned`, and the offer states
// `countered` / `withdrawn` / `paid`. Rows in those states were visible under
// "All" and isolatable by nothing. All ten now have chips; anything genuinely
// not worth a chip goes in that audit entry's `omit` list with a reason.

/** Admin > Products — listing status filter chip set. Real `ProductStatus`
 *  is draft|published|in_review|archived — "pending" fixed to "in_review"
 *  (its real meaning); the previous id never matched any document. */
export const ADMIN_PRODUCT_STATUS_TABS = [
  ALL_TAB,
  { id: "in_review", label: "Pending" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
] as const satisfies readonly AdminFilterTab[];

/**
 * Admin > Products — listing-type filter chip set.
 *
 * IDs are canonical `ListingType` values (2026-08-21). They used to be display
 * LABELS ("Products", "Pre-orders", …) translated to a Sieve clause through a
 * `TYPE_FILTER_MAP` lookup in AdminProductsView — an indirection that hid two
 * whole missing types (`art`, `stickers`) and put the array outside the reach
 * of `audit-filter-tab-enums.mjs`, which compares chip ids against the real
 * backing enum. Now registered there, so a missing or misspelled type blocks.
 *
 * Multi-select: this feeds a `<FilterChipGroup multiple>`, so several types can
 * be active at once and the selection is emitted as a pipe-joined OR-group.
 */
export const ADMIN_PRODUCT_LISTING_TYPE_TABS = [
  ALL_TAB,
  { id: "standard", label: "Products" },
  { id: "auction", label: "Auctions" },
  { id: "pre-order", label: "Pre-orders" },
  { id: "prize-draw", label: "Prize Draws" },
  { id: "classified", label: "Classifieds" },
  { id: "digital-code", label: "Digital Codes" },
  { id: "live", label: "Live Items" },
  { id: "art", label: "Art" },
  { id: "stickers", label: "Stickers" },
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

/** Admin > Users — role filter chip set. IDs match the canonical UserRole
 *  union ("user" | "seller" | "moderator" | "employee" | "admin") and the
 *  Firestore `users/{uid}.role` field. The label "Buyer" maps to id "user"
 *  per SB-UNI-E. Previously sent "buyer" which silently returned 0 rows. */
export const ADMIN_USER_ROLE_TABS = [
  ALL_TAB,
  { id: "admin", label: "Admin" },
  { id: "seller", label: "Seller" },
  { id: "user", label: "Buyer" },
  { id: "moderator", label: "Moderator" },
  { id: "employee", label: "Employee" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Stores — seller-onboarding state filter chip set. */
export const ADMIN_STORE_STATUS_TABS = [
  ALL_TAB,
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
  { id: "rejected", label: "Rejected" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Payouts — payout state filter chip set. Lowercase IDs match
 *  `PayoutStatusValues` and the actual Firestore document `status` field. */
export const ADMIN_PAYOUT_STATUS_TABS = [
  ALL_TAB,
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "paid", label: "Paid" },
  { id: "failed", label: "Failed" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Audit Log — action-type filter chip set. IDs match
 *  `AdminAuditActionValues` (`appkit/src/features/audit-log/schemas/firestore.ts`) exactly. */
export const ADMIN_AUDIT_LOG_ACTION_TABS = [
  ALL_TAB,
  { id: "user_hard_ban", label: "Hard ban" },
  { id: "user_soft_ban", label: "Soft ban" },
  { id: "user_unban", label: "Unban" },
  { id: "checkout_bypass", label: "Checkout bypass" },
  { id: "coupon_update", label: "Coupon update" },
  { id: "payout_mark_paid", label: "Payout paid" },
  { id: "store_status_change", label: "Store status" },
  { id: "user_role_change", label: "Role change" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Orders — order-state filter chip set. Lowercase IDs match
 *  `OrderStatusValues` and the actual Firestore document `status` field. */
export const ADMIN_ORDER_STATUS_TABS = [
  ALL_TAB,
  { id: "pending", label: "Pending" },
  // `confirmed` and `returned` were both missing until 2026-08-24 even though
  // both are real `OrderStatusValues` an order reaches — so an admin could see
  // such an order in the All tab and had no chip that would isolate it.
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refunded", label: "Refunded" },
  { id: "return_requested", label: "Return Requested" },
  { id: "returned", label: "Returned" },
] as const satisfies readonly AdminFilterTab[];

/**
 * Admin > Orders — manual-payment (cash / UPI / EMI) review queue.
 *
 * Deliberately NOT a `status` chip set: these two states are *derived* from
 * `paymentProofUrl` + `paymentReviewOutcome`, both of which are absent-by-
 * default fields that no Firestore equality filter can select on. The IDs are
 * `PaymentReviewQueueMode` values and are sent as the `paymentReview` query
 * param (not a Sieve filter) — see `orderRepository.listPaymentReviewQueue`.
 */
export const ADMIN_ORDER_PAYMENT_REVIEW_TABS = [
  ALL_TAB,
  { id: "awaiting_proof", label: "Awaiting payment" },
  { id: "awaiting_verification", label: "Awaiting verification" },
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

/** Admin > Events — event-state filter chip set. Real `EventStatus` is
 *  draft|active|paused|ended|cancelled — there is no "published" value
 *  (field-names.ts's copy of this enum is stale; verified against the
 *  feature's own events/types/index.ts). A "Published" chip previously
 *  returned zero rows every time — removed rather than aliased since
 *  "Active" already covers the intended meaning. */
/**
 * Every `EventStatus`, not a subset. `paused` and `cancelled` were missing
 * until 2026-08-24 — a real status with no chip is unreachable, and
 * `audit-filter-tab-enums` never caught it because that audit only checks the
 * reverse (that no chip names a DEAD value).
 */
export const ADMIN_EVENT_STATUS_TABS = [
  ALL_TAB,
  { id: "draft", label: "Draft" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "ended", label: "Ended" },
  { id: "cancelled", label: "Cancelled" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Scammers — scammer profile status filter chip set. */
export const ADMIN_SCAMMER_STATUS_TABS = [
  ALL_TAB,
  { id: "pending_review", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "rejected", label: "Rejected" },
  { id: "removed", label: "Removed" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Support Tickets — ticket-status filter chip set. */
export const ADMIN_SUPPORT_TICKET_STATUS_TABS = [
  ALL_TAB,
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "waiting_on_user", label: "Waiting" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
] as const satisfies readonly AdminFilterTab[];

/** Admin > Support Tickets — priority filter chip set. */
export const ADMIN_SUPPORT_TICKET_PRIORITY_TABS = [
  ALL_TAB,
  { id: "urgent", label: "Urgent" },
  { id: "high", label: "High" },
  { id: "normal", label: "Normal" },
  { id: "low", label: "Low" },
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

/** Seller > Products — listing-state filter chip set. Real `ProductStatus`
 *  is draft|published|in_review|archived — there is no "active" or "sold"
 *  value on the `status` field. "Active" was fixed to "published" (its real
 *  meaning); "Sold" was removed since sold-filtering already has its own
 *  correct, working mechanism (the `isSold`-driven "Show sold" toolbar
 *  toggle in SellerProductsView.tsx) — the status chip duplicated it with
 *  a broken `status=="sold"` query that always returned zero rows. */
export const SELLER_PRODUCT_STATUS_TABS = [
  ALL_TAB,
  { id: "published", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
  { id: "in_review", label: "In Review" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Auctions — auction-state filter chip set. Real `ProductStatus`
 *  has no "active"/"ended"/"cancelled" values. "Active" fixed to
 *  "published". "Ended" and "Cancelled" removed — "ended" is a derived
 *  state (auctionEndDate vs now), not a stored status, and is now handled
 *  by SellerAuctionsView's "Show ended" toolbar toggle; there is no stored
 *  "cancelled" state for auctions at all (an auction that expires with no
 *  bids becomes `archived`, indistinguishable in storage from a listing the
 *  seller archived for any other reason — aliasing "Cancelled" to
 *  `status==archived` would be misleading, so it's dropped rather than
 *  reintroduced under a wrong mapping). */
export const SELLER_AUCTION_STATUS_TABS = [
  ALL_TAB,
  { id: "published", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "in_review", label: "In Review" },
  { id: "archived", label: "Archived" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Pre-orders — pre-order-state filter chip set. Same root cause
 *  and fix as SELLER_AUCTION_STATUS_TABS above — no "active"/"cancelled"
 *  status values exist; pre-order cancellation, if tracked, lives in the
 *  separate `preOrderProductionStatus` field, not `status`. */
export const SELLER_PRE_ORDER_STATUS_TABS = [
  ALL_TAB,
  { id: "published", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
  { id: "in_review", label: "In Review" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Prize Draws — draw-state filter chip set. Same root cause and
 *  fix as SELLER_AUCTION_STATUS_TABS — "ended" is derived from
 *  `prizeRevealWindowEnd` vs now (handled by the "Show closed" toolbar
 *  toggle), no stored "cancelled" state exists. */
export const SELLER_PRIZE_DRAW_STATUS_TABS = [
  ALL_TAB,
  { id: "published", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "in_review", label: "In Review" },
  { id: "archived", label: "Archived" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Orders — order-state filter chip set. Subset of
 *  `ADMIN_ORDER_STATUS_TABS` — sellers don't see `RETURN_REQUESTED` until
 *  the buyer initiates one through support. IDs are lowercase to match the
 *  real stored `OrderStatusValues` (Firestore `==` is byte-exact — the
 *  previous uppercase ids never matched any document, every chip here
 *  silently returned zero rows). */
export const SELLER_ORDER_STATUS_TABS = [
  ALL_TAB,
  { id: "pending", label: "Pending" },
  // `confirmed` is settable from SellerOrdersView's own Update-Status dropdown
  // but had no chip here, so a seller could move an order into a state they
  // could then never filter for. `return_requested` was excluded on the theory
  // that sellers never see one — they do, it is the state a buyer's return
  // request lands in and the seller is the one who has to act on it.
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refunded", label: "Refunded" },
  { id: "return_requested", label: "Return Requested" },
  { id: "returned", label: "Returned" },
] as const satisfies readonly AdminFilterTab[];

/**
 * Admin > Offers — the FULL `OfferStatus` union, unlike the seller variant
 * below, which deliberately surfaces only the four states a seller acts on.
 * An admin is auditing the whole lifecycle, so `countered`, `withdrawn` and
 * `paid` all need to be reachable. Cross-checked against the real union by
 * `audit-filter-tab-enums`.
 */
export const ADMIN_OFFER_STATUS_TABS = [
  ALL_TAB,
  { id: "pending", label: "Pending" },
  { id: "countered", label: "Countered" },
  { id: "accepted", label: "Accepted" },
  { id: "paid", label: "Paid" },
  { id: "declined", label: "Declined" },
  { id: "expired", label: "Expired" },
  { id: "withdrawn", label: "Withdrawn" },
] as const satisfies readonly AdminFilterTab[];

/** Seller > Offers — offer-state filter chip set. Real `OfferStatus` is
 *  pending|accepted|declined|countered|expired|withdrawn|paid — there is no
 *  "rejected" value, the real one is "declined" (the id below was fixed;
 *  the previous "rejected" id always returned zero rows). Label kept as
 *  "Rejected" for continuity with existing seller-facing wording. */
export const SELLER_OFFER_STATUS_TABS = [
  ALL_TAB,
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Rejected" },
  { id: "expired", label: "Expired" },
  { id: "countered", label: "Countered" },
  { id: "withdrawn", label: "Withdrawn" },
  { id: "paid", label: "Paid" },
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
