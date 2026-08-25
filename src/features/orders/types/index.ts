import {
  type PaymentGateway,
  PaymentGatewayValues,
} from "../../payments/schemas";
export { type PaymentGateway, PaymentGatewayValues };
import type { ListingType } from "../../products/types/index";
import type { OrderType } from "../utils/order-splitter";
import type { AppliedOrderDiscount, OrderSourceContext } from "../schemas/firestore";
import type { FieldChange } from "../../../_internal/shared/history/index";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded"
  | "partial_refund";

export interface UserAddress {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  phone?: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "return_requested"
  | "returned";

export interface OrderItem {
  productId: string;
  title: string;
  image?: string;
  price: number;
  quantity: number;
  currency?: string;
  storeId?: string;
  attributes?: Record<string, string>;
  /** Listing kind at the time of order — needed for prize-draw UI hints (SB8-F). */
  listingType?: ListingType;
  /**
   * Per-item prize-draw reveal status (SB8-F). Populated by the checkout
   * actions when listingType === "prize-draw". Used to render the
   * "X reveals pending" badge on user orders.
   */
  prizeRevealStatus?: "pending" | "open" | "closed" | "revealed";
  /** Set when the buyer cancels this specific line item post-order (partial cancellation). */
  cancelledQuantity?: number;
  /**
   * SB-UNI-4 2026-05-13 — bundle identifier when this order line represents a
   * bundle purchase. `productId` then points at the bundle category id and
   * `bundleProductIds` snapshots the included member product ids. Per-member
   * stock decrement + order fan-out lands in S-SBUNI-5.
   */
  bundleCategorySlug?: string;
  /** Snapshot of bundle.bundleProductIds at order-creation time. */
  bundleProductIds?: string[];
}

/**
 * One entry on an order's timeline — the client-facing shape of
 * `StatusChangeEntry`, with dates as ISO strings.
 *
 * The previous declaration here was `{status, message?, timestamp, actor?}`
 * and had **zero writers** in the entire codebase since the day it was
 * added, so nothing depended on it. `OrderStatusTimeline` synthesised its
 * steps from four scalar date fields instead, which meant any transition
 * without a dedicated date field — payment reviewed, proof re-upload asked
 * for, a partial refund posted — could not appear at all.
 */
export interface OrderTimelineEntry {
  at: string;
  actorUid?: string;
  actorRole: "buyer" | "seller" | "admin" | "system";
  /**
   * Delta only: `{ status: { from: "confirmed", to: "shipped" } }`.
   * Reuses the primitive's `FieldChange` rather than restating the shape, so
   * the client type cannot drift from what the repository writes.
   */
  changes: Record<string, FieldChange>;
  reason?: string;
  note?: string;
  /** The function or job that caused it — what the timeline renders by. */
  trigger: string;
}

/** @deprecated Use {@link OrderTimelineEntry}. Kept only to avoid breaking a stale import. */
export type OrderTimeline = OrderTimelineEntry;

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  address: UserAddress;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  /**
   * Which checkout lane produced this order. Absent on orders written before
   * the field existed — treat missing as `"standard"`, never filter it out.
   */
  orderType?: OrderType;
  /** Set when this order settled an accepted Make-an-Offer. */
  offerId?: string;
  paymentGateway?: PaymentGateway;
  subtotal: number;
  shippingCost?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency: string;
  /**
   * First applied coupon's code only. Kept for back-compat; prefer
   * `appliedDiscounts` when rendering, since a cart may stack one coupon per
   * store plus one platform-wide coupon and this scalar shows only one of them.
   */
  couponCode?: string;
  /** Total rupee value of every discount applied to this order. */
  couponDiscount?: number;
  /** Every discount applied to this order — the full stack, not just the first. */
  appliedDiscounts?: AppliedOrderDiscount[];

  /**
   * Paid add-ons the buyer opted into for THIS order (= this store).
   *
   * These are operational flags, not just billing records: `whatsappNotifyAddon`
   * is what the status-change notifier checks to decide whether to send a
   * WhatsApp message, and `giftWrapAddon`/`shipmentProtectionAddon` are what
   * the packer needs to see before dispatch. They live on the order itself and
   * are filterable (`orders` SIEVE_FIELDS) precisely so nobody has to keep a
   * separate list of who asked for what.
   */
  whatsappNotifyAddon?: boolean;
  whatsappNotifyFee?: number;
  giftWrapAddon?: boolean;
  giftWrapFee?: number;
  /** The buyer's gift message — the packer has to physically include this. */
  giftWrapMessage?: string;
  shipmentProtectionAddon?: boolean;
  shipmentProtectionFee?: number;
  /** Buyer-facing platform commission apportioned to this order. */
  platformFee?: number;

  trackingNumber?: string;
  shippingCarrier?: string;
  /** Carrier tracking page URL — rendered as an external link that opens in a new tab. No live-tracking API integration; this is just the passthrough URL a seller/admin entered. */
  trackingUrl?: string;
  notes?: string;
  /** Real recorded transitions — see {@link OrderTimelineEntry}. */
  timeline?: OrderTimelineEntry[];
  /** Entries trimmed off the front of the capped history, if any. */
  timelineTruncated?: number;
  /** How the buyer acquired the right to buy. Written once, at creation. */
  sourceContext?: OrderSourceContext;
  physicalLocation?: { zone: string; shelf: string; bin: string };
  createdAt?: string;
  updatedAt?: string;
  /** Real per-status timestamps written by the order-status-update path — used to render a genuine status timeline (not fabricated/estimated). */
  orderDate?: string;
  shippingDate?: string;
  deliveryDate?: string;
  cancellationDate?: string;
  /** Tier PP — true when the 2-hour auto-approve sweep confirmed this order's payment instead of a manual admin review. Drives the "Raise a dispute" CTA. */
  autoApproved?: boolean;
  disputeRaised?: boolean;
  disputeStatus?: "open" | "resolved";
  /**
   * Manual-payment (cash / UPI / EMI) fields. Every one of these already
   * existed on `OrderDocument` but was dropped by `orderDocumentToOrder`,
   * so the buyer-facing surfaces that need them read `undefined`:
   * `/user/orders/[id]/payment` gated its whole render on `paymentMethod`
   * and therefore told every buyer "this order does not require manual
   * payment upload", and the 15-minute countdown + UPI ID never rendered.
   * (CLAUDE.md Root Cause Pattern #38 — adapter/serializer field drift.)
   */
  paymentMethod?: string;
  /** UPI ID the buyer was told to pay to — shown on the payment page and diffed against `buyerReportedUpiId` during admin review. */
  displayedUpiId?: string;
  /** ISO end of the 15-minute payment window; drives the buyer countdown. */
  paymentDeadline?: string;
  paymentProofUrl?: string;
  paymentProofUploadedAt?: string;
  paymentTransactionId?: string;
  buyerReportedUpiId?: string;
  buyerMarkedPaid?: boolean;
  paymentUpiMismatch?: boolean;
  /** Admin decision on the submitted proof; unset means "not reviewed yet". */
  paymentReviewOutcome?: "approved" | "reupload_requested" | "rejected_fraud";
  /** Admin's note — the reason shown to the buyer on a re-upload request or fraud rejection. */
  paymentReviewNote?: string;
  /** Why the order was cancelled — distinguishes a payment-window expiry / fraud rejection from an ordinary cancellation. */
  cancellationReason?: string;
  /**
   * Reveal-mode prize-draw fields (SB4-H/SB8-C). Set once the winner has
   * been automatically assigned to this order (on payment confirmation,
   * draw expiry, or sellout — see assignPrizeDrawWinner); drives the
   * PrizeRevealModal's "won" display on the order-detail page.
   */
  prizeWon?: { itemNumber: number; title: string; images: string[]; wonAt: string };
  /** Source prize-draw product id, when this order came from one. */
  prizeDrawProductId?: string;
  /** Denormalized from the product at order-creation time — drives PrizeRevealModal copy. */
  prizeRevealMode?: "instant" | "scheduled";
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface OrderListParams {
  userId?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sort?: string;
  page?: number;
  perPage?: number;
}
