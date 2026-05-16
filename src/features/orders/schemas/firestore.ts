/**
 * Orders Firestore Document Types & Constants
 */

import { generateOrderId } from "../../../utils/id-generators";
import type { OrderStatus, PaymentStatus } from "../types";
import type { OrderType } from "../utils/order-splitter";

export type ShippingMethod = "custom" | "shiprocket";
export type RefundType = "full" | "partial";
export type OrderPayoutStatus = "eligible" | "requested" | "paid";
export type RefundStatus = "pending" | "processing" | "completed" | "rejected";

/** Runtime-accessible shipping method values â€" use instead of bare string literals. */
export const ShippingMethodValues = {
  CUSTOM: "custom",
  SHIPROCKET: "shiprocket",
} as const satisfies Record<string, ShippingMethod>;

/** Runtime-accessible order status values â€" use instead of bare string literals. */
export const OrderStatusValues = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  RETURN_REQUESTED: "return_requested",
  RETURNED: "returned",
} as const satisfies Record<string, OrderStatus>;

/** Runtime-accessible payment status values â€" use instead of bare string literals. */
export const PaymentStatusValues = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIAL_REFUND: "partial_refund",
} as const satisfies Record<string, PaymentStatus>;

/** Runtime-accessible payment method values â€" use instead of bare string literals. */
export const PaymentMethodValues = {
  COD: "cod",
  ONLINE: "online",
  UPI_MANUAL: "upi_manual",
  RAZORPAY: "razorpay",
  ADMIN_BYPASS: "admin_bypass",
} as const;

/** Runtime-accessible refund status values â€" use instead of bare string literals. */
export const RefundStatusValues = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const satisfies Record<string, RefundStatus>;

/** Firestore storage shape for an order line item â€" distinct from the API display model OrderItem */
export interface OrderDocumentItem {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /** SB8-F â€" set when the item is a prize-draw entry; drives the reveals badge. */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "classified" | "digital-code" | "live";
  /** SB8-F â€" per-item reveal status; flips through pending â†' open â†' revealed/closed. */
  prizeRevealStatus?: "pending" | "open" | "closed" | "revealed";
  /** SB8-F â€" ISO timestamp; deadline by which the buyer must claim the prize. */
  prizeRevealDeadline?: string;
  /** SB8-F â€" set after the reveal API picks a winner. */
  revealedItemNumber?: number;
}

/**
 * One refund event on an order. Multiple partial refund events are allowed
 * until the cumulative amount equals the order total, at which point the order
 * transitions to full-refund terminal state. Once any refund is posted the
 * order's `contestable` flag becomes false permanently.
 */
export interface OrderRefundEvent {
  refundId: string;
  type: RefundType;
  /** Amount in paise. */
  amount: number;
  /** ProductIds / itemIds that were refunded (for partial refunds). */
  itemIds?: string[];
  reason: string;
  refundedAt: Date;
  refundedBy: string; // userId of admin / seller who issued the refund
  /** Set when Razorpay processed the refund. */
  razorpayRefundId?: string;
  /** Set when refund was processed manually (offline). */
  manualTransactionId?: string;
  /** Proof document URL (via /api/media signed-URL flow). */
  proofDocumentUrl?: string;
  proofDocumentMimeType?: string;
  /** Required for Razorpay-override path ("failed auto-refund, settled manually"). */
  overrideReason?: string;
}

/** One applied discount/coupon saved on the order for accounting and display */
export interface AppliedOrderDiscount {
  code: string;
  couponId?: string;
  type: "coupon" | "deal" | "auto";
  discountAmount: number;
  scope?: "admin" | "seller";
  storeId?: string;
}

export interface OrderDocument {
  id: string;
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  storeId?: string;
  storeName?: string;
  items?: OrderDocumentItem[];
  orderType?: OrderType;
  imageUrls?: string[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paymentMethod?: string;
  shippingAddress?: string;
  trackingNumber?: string;
  notes?: string;
  orderDate: Date;
  shippingDate?: Date;
  deliveryDate?: Date;
  cancellationDate?: Date;
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  refundFeeDeducted?: number;
  refundNetAmount?: number;
  refundNote?: string;
  couponCode?: string;
  couponDiscount?: number;
  /** Full list of all applied coupons/discounts for this order group */
  appliedDiscounts?: AppliedOrderDiscount[];
  platformFee?: number;
  depositAmount?: number;
  codRemainingAmount?: number;
  shippingFee?: number;
  shippingMethod?: ShippingMethod;
  shippingCarrier?: string;
  trackingUrl?: string;
  shiprocketOrderId?: number;
  shiprocketShipmentId?: number;
  shiprocketAWB?: string;
  shiprocketStatus?: string;
  shiprocketUpdatedAt?: Date;
  payoutStatus?: OrderPayoutStatus;
  payoutId?: string;
  offerId?: string;

  // â"€â"€ SB1-F (S19 2026-05-12) â€" prize-draw + bundle additive fields â"€â"€â"€â"€â"€â"€â"€â"€â"€
  /**
   * Populated when the linked product is a prize-draw and the reveal has
   * assigned a prize to this order. `wonAt` is the moment of assignment, not
   * the moment the order was placed.
   */
  prizeWon?: {
    itemNumber: number;
    title: string;
    images: string[];
    wonAt: Date;
  };
  /** Deadline for the buyer to claim the won prize (typically 7 days). */
  prizeRevealDeadline?: Date;
  /** True once `prizeRevealDeadline` passes without a claim â€" auto-forfeit. */
  prizeRevealExpired?: boolean;
  /** Source product id when the order came from a prize-draw entry. */
  prizeDrawProductId?: string;
  /** True for prize-draw entries and bundle purchases that bypass refund. */
  isNonRefundable?: boolean;
  /** Set when the order came from a bundle â€" points back to `bundles/{id}`. */
  bundleId?: string;

  // ── Multi-order payment batch (S-SBUNI-RULES 2026-05-13) ────────────────
  /**
   * Internal reference linking sibling orders created from the same checkout
   * transaction (one Razorpay payment, N orders). Not a contractual record —
   * orders are the source of truth for invoicing, refunds, and disputes.
   */
  paymentBatchId?: string;

  // ── Refund machinery (S-SBUNI-RULES 2026-05-13) ─────────────────────────
  /**
   * Append-only log of refund events on this order. Multiple partial refund
   * events are allowed until the cumulative amount equals `totalPrice`.
   */
  refunds?: OrderRefundEvent[];
  /**
   * False once ANY refund (full or partial) has been posted. Once false it
   * stays false — no dispute, RMA request, or "Item Not Received" claim may
   * be filed. Both buyer and seller must acknowledge this in the refund UI
   * via `confirmIrrevocable: true` before the refund is posted.
   */
  contestable?: boolean;

  /** UID of the admin who triggered an admin-bypass checkout. Set only when paymentMethod === "admin_bypass". */
  adminBypassBy?: string;

  // ── Shipping proof (S-SBUNI-RULES 2026-05-13) ───────────────────────────
  /** Signed-URL media slug for a shipping-proof document (label, AWB scan). */
  shippingProofUrl?: string;
  shippingProofMimeType?: string;
  shippingProofUploadedAt?: Date;
  shippingProofUploadedBy?: string;

  /** Physical staging location for fulfilment management (Print & Label Center). */
  physicalLocation?: {
    zone: string;
    shelf: string;
    bin: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

export const ORDER_COLLECTION = "orders" as const;

export const ORDER_INDEXED_FIELDS = [
  "userId",
  "productId",
  "storeId",
  "status",
  "paymentStatus",
  "payoutStatus",
  "shippingMethod",
  "orderDate",
  "createdAt",
] as const;

export const DEFAULT_ORDER_DATA: Partial<OrderDocument> = {
  status: "pending",
  paymentStatus: "pending",
  quantity: 1,
};

export const ORDER_PUBLIC_FIELDS = [
  "id",
  "productId",
  "productTitle",
  "quantity",
  "unitPrice",
  "totalPrice",
  "currency",
  "status",
  "paymentStatus",
  "shippingAddress",
  "trackingNumber",
  "notes",
  "orderDate",
  "shippingDate",
  "deliveryDate",
  "createdAt",
] as const;

export const ORDER_UPDATABLE_FIELDS = ["notes", "shippingAddress"] as const;

export type OrderCreateInput = Omit<
  OrderDocument,
  "id" | "createdAt" | "updatedAt" | "orderDate"
>;
export type OrderUpdateInput = Partial<
  Pick<OrderDocument, (typeof ORDER_UPDATABLE_FIELDS)[number]>
>;
export type OrderAdminUpdateInput = Partial<
  Omit<OrderDocument, "id" | "createdAt">
>;

export const orderQueryHelpers = {
  byUser: (userId: string) => ["userId", "==", userId] as const,
  byStore: (storeId: string) => ["storeId", "==", storeId] as const,
  byProduct: (productId: string) => ["productId", "==", productId] as const,
  byStatus: (status: OrderStatus) => ["status", "==", status] as const,
  byPaymentStatus: (status: PaymentStatus) =>
    ["paymentStatus", "==", status] as const,
  confirmed: () => ["status", "==", "confirmed"] as const,
  pending: () => ["status", "==", "pending"] as const,
  shipped: () => ["status", "==", "shipped"] as const,
  delivered: () => ["status", "==", "delivered"] as const,
  paid: () => ["paymentStatus", "==", "paid"] as const,
  recentOrders: (date: Date) => ["orderDate", ">=", date] as const,
} as const;

export function createOrderId(productCount: number, date?: Date): string {
  return generateOrderId({ productCount, date });
}
