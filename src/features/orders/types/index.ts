import {
  type PaymentGateway,
  PaymentGatewayValues,
} from "../../payments/schemas";
export { type PaymentGateway, PaymentGatewayValues };
import type { ListingType } from "../../products/types/index";

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

export interface OrderTimeline {
  status: OrderStatus;
  message?: string;
  timestamp: string;
  actor?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  address: UserAddress;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentGateway?: PaymentGateway;
  subtotal: number;
  shippingCost?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency: string;
  couponCode?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  /** Carrier tracking page URL — rendered as an external link that opens in a new tab. No live-tracking API integration; this is just the passthrough URL a seller/admin entered. */
  trackingUrl?: string;
  notes?: string;
  timeline?: OrderTimeline[];
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
