/**
 * Orders Firestore Document Types & Constants
 */

import { generateOrderId } from "../../../utils/id-generators";
import type { OrderStatus, PaymentStatus } from "../types";
import type { OrderType } from "../utils/order-splitter";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { ListingType } from "../../products/types";
import type { StatusChangeEntry } from "../../../_internal/shared/history/index";

// ── Acquisition provenance ────────────────────────────────────────────────
//
// Six paths, not five. `OrderType` has only `"auction"`, which cannot tell a
// won auction from a bought-out one — yet the two differ in what set the
// price: one is the highest bid at close, the other is a fixed buyout price
// that beat the standing bid. BOTH involve real bids (a buyout writes its own
// `BidDocument`), so neither is distinguishable by bid count either. Hence a
// discriminator of this union's own.
//
// Every variant records the price it DISPLACED (`listPrice`), because that is
// what makes "you saved ₹800" provable months later, and it is exactly what
// disappears when the product is re-priced afterwards.

export interface OrderSourceStandard {
  path: "standard";
  listPrice: number;
}

export interface OrderSourceAuctionWon {
  path: "auction-won";
  auctionId: string;
  bidId: string;
  winningBidAmount: number;
  /** Bids placed across the whole auction — the "against N bidders" figure. */
  bidCount: number;
  startingBid: number;
  reservePrice?: number;
  reserveMet: boolean;
  auctionEndedAt: Date;
  /** Second-highest bid, when there was one. */
  runnerUpAmount?: number;
}

/**
 * A buyout is a REAL BID, not a bid-free purchase.
 *
 * An earlier draft of this type asserted "zero bids BY DEFINITION, because
 * buy-now is only valid while `!bidsHaveStarted`". That gate no longer
 * exists: `buyNowAuction` places an actual `BidDocument` (`isBuyout: true`)
 * plus a 1h locked cart line and leaves the auction **live**, and Buy Now is
 * offered whenever `buyNowPrice` still beats the standing bid. Recording
 * `bidCount: 0` would bake a falsehood into an immutable audit record.
 *
 * `standingBidAtBuyout` is the highest NON-buyout bid the buyout beat — read
 * from the bids rather than `product.currentBid`, because a pending buyout
 * deliberately never writes to that mirror.
 *
 * An unpaid buyout lapses to **`cancelled`**, not `forfeited`, and the seller
 * is deliberately not notified: nothing was ever sold. That makes its
 * timeline materially different from a lapsed auction win.
 */
export interface OrderSourceAuctionBuyNow {
  path: "auction-buy-now";
  auctionId: string;
  /** The buyout bid itself — a buyout IS a bid. */
  bidId: string;
  buyNowPrice: number;
  listPrice: number;
  /** Highest non-buyout bid at the moment of buyout. 0 when nobody had bid. */
  standingBidAtBuyout: number;
  /** Active non-buyout bids at buyout time. NOT always zero. */
  bidCount: number;
  boughtAt: Date;
  /** `min(now + AUCTION_BUYOUT_WINDOW_MS, auctionEndDate)`. */
  checkoutDeadline: Date;
  auctionEndDate?: Date;
}

export interface OrderSourceOfferAccepted {
  path: "offer-accepted";
  offerId: string;
  offeredAmount: number;
  /** The asking price at the moment the offer was made. */
  listPriceAtOffer: number;
  counterAmount?: number;
  /**
   * How many counter rounds before agreement. 1 = accepted outright.
   *
   * Read straight off the accepted offer's `counterRound`, which W2 made a
   * persisted field. Before that this number was **unknowable**: each counter
   * created an unlinked document and `previousOfferId` lived only inside a
   * `serverLogger.info` call, so a three-round negotiation left no trace of
   * having been one.
   */
  counterRounds: number;
  acceptedBy: string;
  acceptedAt: Date;
  checkoutDeadline?: Date;
}

export interface OrderSourcePreOrder {
  path: "pre-order";
  depositAmount: number;
  balanceDue: number;
  expectedDeliveryDate?: Date;
}

export interface OrderSourcePrizeDraw {
  path: "prize-draw";
  prizeDrawProductId: string;
  pricePerEntry: number;
  entryCount: number;
  revealMode: "instant" | "scheduled";
}

export type OrderSourceContext =
  | OrderSourceStandard
  | OrderSourceAuctionWon
  | OrderSourceAuctionBuyNow
  | OrderSourceOfferAccepted
  | OrderSourcePreOrder
  | OrderSourcePrizeDraw;

/** Manual shipping is the only supported method — sellers enter carrier + tracking directly, no carrier API integration. */
export type ShippingMethod = "custom";
export type RefundType = "full" | "partial";
export type OrderPayoutStatus = "eligible" | "requested" | "paid";
export type RefundStatus = "pending" | "processing" | "completed" | "rejected";

/** Runtime-accessible shipping method values â€" use instead of bare string literals. */
export const ShippingMethodValues = {
 CUSTOM: "custom",
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
  CASH: "cash",
  ONLINE: "online",
  UPI_MANUAL: "upi_manual",
  RAZORPAY: "razorpay",
  ADMIN_BYPASS: "admin_bypass",
  EMI: "emi",
} as const;

/**
 * Buyer-chosen policy for what happens when an item in the cart becomes
 * unavailable between add-to-cart and checkout — either COD/UPI (stock
 * validated in the checkout transaction) or Razorpay (stock validated after
 * payment capture). "skip_items" ships whatever remains available; "cancel_order"
 * rejects the whole checkout batch if anything is short.
 */
export type OutOfStockPolicy = "cancel_order" | "skip_items";

/** Runtime-accessible out-of-stock policy values — use instead of bare string literals. */
export const OutOfStockPolicyValues = {
  CANCEL_ORDER: "cancel_order",
  SKIP_ITEMS: "skip_items",
} as const satisfies Record<string, OutOfStockPolicy>;

export type EmiInstallmentStatus = "pending" | "paid" | "overdue";

export interface EmiInstallment {
  /** 1-based installment number. */
  index: number;
  dueDate: Date;
  /** Installment amount in decimal rupees (principal share + surcharge share for this installment). */
  amount: number;
  status: EmiInstallmentStatus;
  paidAt?: Date;
  /** Buyer-uploaded UTR/reference number for this installment's manual payment. */
  transactionId?: string;
  /** Signed-URL media slug for the buyer's payment proof for this installment. */
  proofUrl?: string;
  /** Set once the reminder sweep has notified the buyer for this installment, so it isn't re-sent on every sweep run. */
  reminderSentAt?: Date;
}

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
  /** Snapshotted from the product/cart-item at order time so the order-detail UI can render a thumbnail without an extra product fetch. */
  image?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /** SB8-F â€" set when the item is a prize-draw entry; drives the reveals badge. */
 listingType?: ListingType;
 /** SB8-F â€" per-item reveal status; flips through pending â†' open â†' revealed/closed. */
  prizeRevealStatus?: "pending" | "open" | "closed" | "revealed";
  /** Set when the buyer cancels this specific line item post-order (partial cancellation). */
  cancelledQuantity?: number;
  cancelledAt?: Date;
  cancelledReason?: string;
  /** SB-UNI-5 — forwarded from the cart line when this order item is an expanded bundle, so the order-detail UI can collapse it back under a "Bundle: <name>" header and stock-restore logic can fan back out to member products. */
  bundleCategorySlug?: string;
  /** @deprecated Legacy collapsed rows only — expanded rows carry one product each. */
  bundleProductIds?: string[];
  /**
   * Collapse key for a multi-member cart line, shared by every row the line
   * expanded into. `groupOrderItemsByLine` groups on it so the receipt still
   * reads as one "Bundle: X" / "Group: X" block.
   */
  groupSlug?: string;
  /** Display name of the bundle / group these rows came from. */
  groupTitle?: string;
  /** Which kind of multi-member line produced these rows. */
  groupSource?: "bundle" | "product-group" | "grouped-listing";
  /** P-8 GST — snapshotted from the product at order time so the invoice stays accurate even if the product's HSN/rate later changes. */
  hsnCode?: string;
  gstRate?: 0 | 5 | 12 | 18 | 28;
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
  /** Amount in decimal rupees. */
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

export interface OrderDocument extends BaseDocument {
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  storeId?: string;
  storeName?: string;
  items?: OrderDocumentItem[];
  orderType?: OrderType;
  /**
   * True when this `orderType: "auction"` order came from Buy Now rather than
   * from winning the bidding.
   *
   * Not a new `orderType` value on purpose — the /user/orders tabs key on
   * `orderType`, and a buyout IS an auction order from the buyer's point of
   * view. What it changes is the ADMIN review window: a buyout is settled in a
   * one-hour scramble against a still-live auction, so `paymentReviewAutoApprove`
   * gives an admin a full day to verify its proof instead of the usual couple of
   * hours before auto-approving.
   */
  isBuyout?: boolean;
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
  /** COD handling fee charged to the buyer: max(codHandlingFeeMin, subtotal × codHandlingFeePercent / 100). Only set when paymentMethod === "cod". */
  codHandlingFee?: number;
  /** Buyer opted into WhatsApp order-update messages at checkout (unchecked by default). */
  whatsappNotifyAddon?: boolean;
  /** Fee charged for the WhatsApp addon, decimal rupees — snapshot of siteSettings.commissions.whatsappNotifyFee at order time. */
  whatsappNotifyFee?: number;
  /** Buyer opted into gift wrapping at checkout (unchecked by default). */
  giftWrapAddon?: boolean;
  /** Fee charged for gift wrap, decimal rupees — snapshot of siteSettings.commissions.giftWrapFee at order time. */
  giftWrapFee?: number;
  /** Optional buyer-written gift message, shown to the seller for fulfilment. Capped length. */
  giftWrapMessage?: string;
  /** Buyer opted into shipment protection (loss/damage insurance) at checkout (unchecked by default). */
  shipmentProtectionAddon?: boolean;
  /** Fee charged for shipment protection, decimal rupees — snapshot of siteSettings.commissions.shipmentProtectionFeePercent/Min at order time. */
  shipmentProtectionFee?: number;

  // ── P-8 GST — buyer-facing tax breakdown, all decimal rupees, set when siteSettings.gst.enabled ──
  /** Order subtotal before GST — the amount GST is computed on. */
  taxableAmount?: number;
  /** Total GST charged (cgst + sgst, or igst — never both pairs at once). */
  gstAmount?: number;
  /** Intra-state half: buyer and seller/store pickup address share the same state. */
  cgst?: number;
  sgst?: number;
  /** Inter-state: buyer and seller/store pickup address are in different states. */
  igst?: number;

  // ── EMI (installment) fields — only set when paymentMethod === "emi" ────────
  emiEnabled?: boolean;
  /** Number of monthly installments the buyer chose (2–6). */
  emiTenureMonths?: number;
  /** Down payment collected at checkout, in decimal rupees (emiTokenPercent × seller subtotal). */
  emiTokenAmount?: number;
  /** Extra cost of choosing EMI over full payment, in decimal rupees — split between platform and seller. */
  emiSurchargeAmount?: number;
  emiInstallments?: EmiInstallment[];
  /** Sum of unpaid installment amounts, in decimal rupees. 0 once all installments are paid. */
  emiRemainingBalance?: number;
  /** True once every installment's status is "paid". Gates shipment unless the product's `allowShipBeforeEmiComplete` flag is set. */
  emiComplete?: boolean;

  shippingFee?: number;
  shippingMethod?: ShippingMethod;
  shippingCarrier?: string;
  trackingUrl?: string;
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
  /** Source product id when the order came from a prize-draw entry. */
 prizeDrawProductId?: string;
 /** Denormalized from the product at order-creation time — drives reveal copy on the order-detail page without an extra product fetch. */
 prizeRevealMode?: "instant" | "scheduled";
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

  // ── Status history + acquisition provenance (W2) ────────────────────────
  /**
   * Append-only delta log of every tracked-field change on this order —
   * who, when, from what to what, and which function did it.
   *
   * DELTAS, never snapshots: only `statusHistory[0]` (the creation entry)
   * carries a `snapshot`, holding the provenance that cannot be re-derived
   * later because its sources move on — the discounts and add-ons actually
   * applied and the fee breakdown at the moment of purchase.
   *
   * Capped at `STATUS_HISTORY_MAX` (FIFO). An unbounded array on a document
   * this hot inflates every read of it (Rule #6).
   */
  statusHistory?: StatusChangeEntry[];
  /**
   * Entries dropped off the front of `statusHistory` over this order's
   * lifetime. Present so the UI can say "earlier history trimmed" instead
   * of implying the order simply had no earlier history.
   */
  statusHistoryTruncated?: number;
  /**
   * How the buyer acquired the right to buy, written ONCE at creation.
   *
   * A discriminated union rather than optional fields, because `orderType`
   * cannot distinguish an auction that was WON from one that was BOUGHT OUT
   * — both are `"auction"` — and `winningBidAmount`/`bidCount` are
   * meaningless on a buy-now, where there are zero bids by definition.
   *
   * Never recomputed: a settled auction's numbers must not move when the
   * auction document is later archived or the product is re-priced.
   */
  sourceContext?: OrderSourceContext;

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

  /** UID of the employee or seller assigned to fulfil this order. */
  assignedWorkerId?: string;
  /** Timestamp when all items in this order were physically confirmed picked. */
  pickedAt?: Date;
  /** Timestamp when the order was packed and ready for courier handoff. */
  packedAt?: Date;

  // ── Manual / Cash / UPI payment proof (P-1) ─────────────────────────────
  /** Media slug for buyer-uploaded UPI/bank screenshot (via /api/media proxy). */
  paymentProofUrl?: string;
  /** UTR / transaction reference entered by the buyer. */
  paymentTransactionId?: string;
  /** MIME type detected at finalize step (image/jpeg, image/png, application/pdf). */
  paymentProofMimeType?: string;
  /** When the buyer submitted the proof. */
  paymentProofUploadedAt?: Date;

  // ── 15-minute payment window (Tier PP) ───────────────────────────────────
  /**
   * Deadline for the buyer to pay/upload proof. Set only at creation for
   * `upi_manual`/`cash`/`emi` orders — never for `cod`, `razorpay`, or
   * `admin_bypass` (those either pay before order creation or have no proof
   * step). `paymentWindowTimeout` cancels + restocks any order still
   * `pending`/`pending` with no `paymentProofUrl` past this timestamp.
   * Extended by 15 more minutes when admin requests a proof re-upload.
   */
  paymentDeadline?: Date;
  /** True once a cancellation path has restored `availableQuantity` for this order's items. Guards against double-restock. */
  stockRestored?: boolean;
  stockRestoredAt?: Date;

  /**
   * UPI VPA resolved and shown to the buyer at order-creation time — the
   * seller's own `payoutDetails.upiId` for seller-owned stores (falling back
   * to `siteSettings.contact.upiVpa` if unconfigured), or the site UPI
   * directly for admin-owned stores. Immutable "ground truth" for the
   * cross-check below; never client-supplied.
   */
  displayedUpiId?: string;
  /** UPI VPA the buyer says they actually paid from/to, per their own UPI app — the real cross-check signal against `displayedUpiId`. */
  buyerReportedUpiId?: string;
  /** True when `buyerReportedUpiId` doesn't match `displayedUpiId` — surfaced prominently in the admin review UI. */
  paymentUpiMismatch?: boolean;
  /** Buyer's explicit "I have paid" declaration, distinct from admin's own verification. */
  buyerMarkedPaid?: boolean;
  buyerMarkedPaidAt?: Date;
  /** Buyer's required "this payment is genuine, no fraudulent tricks/chargebacks" agreement — server-validated, not just a client-side disable. */
  buyerFraudAgreementAccepted?: boolean;
  buyerFraudAgreementAcceptedAt?: Date;

  /** Which of the three admin review actions was taken on this order's payment proof. */
  paymentReviewOutcome?: "approved" | "reupload_requested" | "rejected_fraud";
  /** Admin's reason text — required for both `reupload_requested` and `rejected_fraud`. */
  paymentReviewNote?: string;
  paymentReviewedBy?: string;
  paymentReviewedAt?: Date;

  /** True when `paymentReviewAutoApprove` approved this order after 2 hours of no manual admin review. */
  autoApproved?: boolean;
  autoApprovedAt?: Date;
  /** Buyer/seller/admin dispute raised against an auto-approved order — surfaces to the admin queue, does not itself reverse payment/order status. */
  disputeRaised?: boolean;
  disputeRaisedBy?: string;
  disputeRaisedAt?: Date;
  disputeReason?: string;
  disputeStatus?: "open" | "resolved";

  // ── Payment Detail Parity (Feature C) ───────────────────────────────────
  /**
   * Same-shape payment record regardless of how the buyer paid — manual
   * (cash/UPI proof), Razorpay (webhook-verified), or COD (collected on
   * delivery). Additive: legacy fields above (`paymentProofUrl`,
   * `paymentTransactionId`, `paymentId`, `paymentMethod`) are left in place
   * for backward compatibility with pre-existing orders — `OrderPaymentSummary`
   * falls back to them when `paymentRecord` is unset. Never renamed/removed.
   */
  paymentRecord?: OrderPaymentRecord;

  // ── Out-of-stock checkout policy (buyer-chosen) ──────────────────────────
  /**
   * The buyer's chosen policy at checkout for what to do when a cart item is
   * unavailable. Set on every order created by the same checkout call — one
   * checkout call is one buyer decision, so a multi-store/bundle checkout's
   * sibling orders all carry the same policy + the full session's dropped
   * items (they aren't cleanly attributable to a single store/order).
   */
  outOfStockPolicy?: OutOfStockPolicy;
  /** Items from this checkout session that were dropped because they were unavailable ("skip_items" policy only). */
  droppedItems?: {
    productId: string;
    productTitle: string;
    requestedQty: number;
    availableQty: number;
  }[];
  /** Set true only when an automatic partial refund (for dropped Razorpay items) failed and needs manual follow-up. */
  refundPending?: boolean;
}

export type OrderPaymentRecordMethod = "manual" | "razorpay" | "cod";
export type OrderPaymentVerificationMethod = "manual_review" | "webhook" | "cod_collection";

export interface OrderPaymentRecord {
  method: OrderPaymentRecordMethod;
  /** UTR (manual) | razorpay_payment_id (razorpay) | collector note/ref (COD). */
  transactionId?: string;
  /** Manual proof upload | COD collection receipt photo (optional) | n/a for razorpay. */
  proofUrl?: string;
  amount: number;
  paidAt?: Date;
  /** Admin/seller uid (manual/COD) | "razorpay-webhook" (razorpay, automatic). */
  verifiedBy?: string;
  verificationMethod: OrderPaymentVerificationMethod;
  /** Razorpay audit trail only. */
  gatewayRef?: {
    orderId?: string;
    paymentId?: string;
    signature?: string;
  };
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
  "assignedWorkerId",
  "pickedAt",
  "packedAt",
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

/**
 * The fields whose changes are recorded in `statusHistory`.
 *
 * Deliberately minimal — the timeline answers "where is my order and what
 * happened to it", nothing else.
 *
 * **Money is NOT tracked here.** `appliedDiscounts`, `storeAddons` and the
 * fee fields hold the FINAL state on the order document, and that is the
 * record. Logging every intermediate coupon/add-on change would bury the five
 * transitions anyone actually reads under pricing churn, and a coupon that
 * was dropped before the order existed is not part of the order's history.
 *
 * **Acquisition is NOT tracked here either** — how the buyer got the right to
 * buy (auction won, offer accepted, bought out) is written once to
 * `sourceContext` at creation. It never changes, so it is not a timeline
 * event.
 *
 * A whole-document diff would append an entry for every `updatedAt` bump —
 * which is every single write — and exhaust the FIFO cap within days.
 */
export const ORDER_TRACKED_FIELDS = [
  "status",
  "paymentStatus",
  /** Manual-payment review: proof verified, re-upload requested, rejected. */
  "paymentReviewOutcome",
  /** The substance of the "shipped" transition. */
  "trackingNumber",
  /** Why it was cancelled — a bare "cancelled" is not a useful entry. */
  "cancellationReason",
] as const;

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
