import type { EmiInstallment } from "../schemas/firestore";
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
  /**
   * Whether this line was final sale when it was bought. Snapshotted on the
   * order document; surfaced here so the buyer's return form can narrow the
   * reason list without a second fetch.
   *
   * Absent means the order predates the field — NOT "returnable". The server
   * gate reads the document, so this is a rendering hint only.
   */
  finalSale?: boolean;
  /**
   * HSN code and GST rate, snapshotted onto the order item at purchase.
   *
   * 🛑 Surfaced here because the INVOICE needs them per line and could not
   * previously get them: `orderDocumentToOrder` mapped `tax: doc.gstAmount`
   * and nothing else tax-related, so the buyer-facing invoice rendered
   * `["Item", "Qty", "Price"]` and one aggregate Tax row — not because the
   * renderer was lazy, but because the adapter never handed it a rate, an HSN
   * or a split to show. Root Cause #57's exact shape.
   */
  hsnCode?: string;
  gstRate?: 0 | 5 | 12 | 18 | 28;
  /**
   * I8 — the TAXONOMY snapshot, surfaced for the first time.
   *
   * 🛑 The third instance of Root Cause #57 in this one adapter. `categorySlug`
   * has been snapshotted onto the order document since C1, with a recorded
   * reason — *"a product re-categorised next year must not retroactively move
   * last year's sale into a band it was never part of"* — and
   * `orderDocumentToOrder` forwarded 13 fields, none of them this one. So the
   * data was right on the document and reached no client surface, which is why
   * no order or invoice page could show a category even though the facts were
   * there.
   *
   * `categoryName` and `brand` are new. A slug survives a rename; a NAME is
   * what a receipt must show, and re-resolving it at render time would let a
   * renamed or deleted category change what a past invoice says. Snapshotting
   * is the whole point: *"the transaction data still keeps it."*
   */
  categorySlug?: string;
  categoryName?: string;
  brand?: string;
  /** Snapshotted condition — the price-index band's dominant variable. */
  condition?: string;
  /**
   * The grouped-line keys. `groupOrderItemsByLine` collapses a bundle or a
   * grouped cart line for the receipt and keys on exactly these, so without
   * them a client renders N rows where the buyer bought one thing.
   */
  groupSlug?: string;
  groupTitle?: string;
  groupSource?: "bundle" | "product-group" | "grouped-listing";
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
  paymentGateway?: string;
  subtotal: number;
  shippingCost?: number;
  discount?: number;
  /** Total GST — product GST plus the GST on our platform fee. */
  tax?: number;
  /**
   * The GST breakdown the INVOICE needs, and which the adapter did not map
   * until 2026-10-10 — so `/user/orders/[id]/invoice` had no GSTIN, no HSN
   * column, no rate column and one undifferentiated "Tax (GST)" row, and was
   * therefore not Rule 46-compliant in any respect.
   *
   * 🛑 `taxableAmount` excludes `exemptAmount`: a 0%-rated supply is a real
   * reportable state, not an absence, and keeping them separate is what lets
   * the invoice's columns reconcile against its own summary.
   */
  taxableAmount?: number;
  exemptAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  /**
   * Taxable value and tax PER RATE — what Rule 46 actually asks for.
   *
   * ✅ This is also why no per-item `gstAmount` was added. Rule 46 requires the
   * tax amount per **rate**, not per **line**; the per-line requirements are
   * HSN, quantity, taxable value and rate, all of which the item already
   * carries or derives from `price × quantity`. A per-item tax amount would be
   * a denormalised mirror of what this array already holds — Root Cause #42's
   * shape — so it was deliberately NOT added.
   */
  gstByRate?: Array<{
    gstRate: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    gstAmount: number;
  }>;
  /**
   * Our GST registration as snapshotted on this order. A tax invoice without
   * the supplier's GSTIN is not a tax invoice — and the invoice page cannot
   * read it from site settings, because `gst` is in `PRIVATE_SITE_FIELDS`
   * after an earlier deny-list projection shipped it publicly (Root Cause #70).
   */
  /**
   * ── EMI, buyer-facing ─────────────────────────────────────────────────
   *
   * 🛑 Declared here because `EmiInstallmentsPanel` is useless without it,
   * and the absence was Root Cause #57's exact shape: the whole EMI schedule
   * sat on `OrderDocument` and `orderDocumentToOrder` mapped none of it, so
   * every buyer surface would have rendered its "no EMI plan" fallback with
   * a real plan on the record. That reads as "this order isn't on EMI"
   * rather than as a bug, which is why it survives.
   */
  emiEnabled?: boolean;
  emiInstallments?: EmiInstallment[];
  /** Sum of unpaid instalments. 0 once the plan is settled. */
  emiRemainingBalance?: number;
  supplierGstin?: string;
  supplierLegalName?: string;
  supplierAddress?: string;
  /**
   * The State whose tax applies — Rule 46(n).
   *
   * 🛑 Declared here for the same reason as the EMI fields above, and it is
   * the same Root Cause #57 shape: `orderDocumentToOrder` mapped the
   * CGST/SGST/IGST split while dropping the field that DECIDES which of them
   * is correct, so the HTML invoice could show an IGST line with nothing on
   * the page justifying it. The PDF reads `OrderDocument` directly and always
   * printed it, so the two invoices for one order disagreed.
   *
   * The State NAME is what the rule asks for; the numeric State code is a
   * GSTR-1/e-invoice convention and is deliberately not stored here.
   */
  placeOfSupply?: string;
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
   * Listing-TYPE level block (prize-draw entries). Distinct from per-line
   * `finalSale`: this refuses every reason, that one refuses only
   * change-of-mind reasons.
   */
  isNonRefundable?: boolean;
  /**
   * False once a refund has been posted — no further dispute or RMA.
   * Was never mapped, so the buyer-facing refund form could not render its
   * "already refunded" state at all.
   */
  contestable?: boolean;
  /** Coded reason recorded when the buyer requested a return. */
  returnReasonCode?: string;
  returnReasonNote?: string;

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
  /** Sale protection — the item itself rather than the transit (C5e). */
  saleProtectionAddon?: boolean;
  saleProtectionFee?: number;
  /** Buyer-facing platform commission apportioned to this order. */
  platformFee?: number;
  /** COD handling fee, charged only on cash-on-delivery orders. */
  codHandlingFee?: number;
  /**
   * D46/D47 — points spent on this order, in points (1 point = ₹1).
   *
   * Absent on every order placed before the tender existed, and absent on any
   * order that used none.
   */
  pointsApplied?: number;
  /**
   * What was actually COLLECTED: `total − pointsApplied`.
   *
   * 🛑 Read it as **`amountDue ?? total`**, never `amountDue ?? 0`. Absent means
   * "no points were used, so the whole total was collected"; zero would mean
   * the order was free. The two are a long way apart on a receipt, and the
   * wrong default turns every historical order into a ₹0 one.
   */
  amountDue?: number;
  /**
   * The invoice number from the gapless FY series, e.g. `LIR/26-27/0001`
   * (Phase 7).
   *
   * Absent until the order is paid, and absent on every order placed before
   * the series existed — so the invoice page must render its own fallback
   * rather than printing "undefined" where a statutory field belongs.
   */
  invoiceNumber?: string;
  invoiceIssuedAt?: string;

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
  /**
   * D55 — the pre-order balance, once the seller has OPENED it for collection.
   *
   * 🛑 Absent until then, and that is the difference between "a balance
   * exists" (`sourceContext.balanceDue > 0`, true from the moment the order
   * was placed) and "a balance is payable". The buyer's panel gates on this
   * field, so forgetting it in `orderDocumentToOrder` would render the
   * "nothing to pay" branch on every order forever — Root Cause #57, which
   * is what made the whole manual-payment flow dead for weeks.
   */
  balance?: {
    amount: number;
    method: "manual";
    status: "awaiting" | "submitted" | "paid" | "rejected";
    dueBy?: string;
    proofUrl?: string;
    transactionId?: string;
    submittedAt?: string;
    reviewedAt?: string;
    reviewNote?: string;
  };
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
   * Completion — the owner's rule, and both writers of one fact.
   *
   * 🛑 Added to the CLIENT type and the adapter together, because adding it to
   * one alone is Root Cause #57 and the symptom is invisible: with
   * `completedAt` undefined, `OrderCompletionPanel` renders its rating UI
   * forever and never shows the "this order is complete" confirmation — which
   * reads as correct behaviour rather than as a dropped field. That is exactly
   * how the whole manual-payment flow sat dead for every buyer: the page gated
   * its render on `paymentMethod`, the adapter mapped only `paymentStatus`, and
   * the result was a polite "this order does not require manual payment".
   *
   * `completedBy` distinguishes the two paths, and they are not the same
   * signal: `"system"` means nobody complained for seven days, a buyer's uid
   * means they said they were happy. Same effect, different fact — so the
   * confirmation copy says which one happened.
   */
  completedAt?: string;
  completedBy?: string;
  /**
   * Anchors the panel needs to decide whether anything is contested.
   *
   * `returnRequestedAt` is load-bearing beyond the status check: a return can
   * be requested and then the status moved on, so the status alone is not a
   * complete answer to "is there a live return".
   */
  returnRequestedAt?: string;
  /**
   * Refund COUNT only, never the events.
   *
   * 🛑 Deliberately not `refunds[]`. The panel needs one bit — "has any money
   * already moved on this order" — and the events carry `refundedBy` (a staff
   * uid), `gatewayRefundId` and a `reason` string assembled for operators.
   * Publishing all that to a buyer's page to answer a yes/no question is the
   * spread-and-publish shape (Root Cause #70); a count answers it and leaks
   * nothing.
   */
  refundCount?: number;
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
   * draw expiry, or sellout — see assignRandomLotsWinner); drives the
   * PrizeRevealModal's "won" display on the order-detail page.
   */
  prizeWon?: { itemNumber: number; title: string; images: string[]; wonAt: string };
  /** Source prize-draw product id, when this order came from one. */
  prizeDrawProductId?: string;
  /** Denormalized from the product at order-creation time — drives PrizeRevealModal copy. */
  prizeRevealMode?: "instant" | "scheduled";
}

/**
 * What happened to the buyer's money when their order was cancelled.
 *
 * 🛑 Lives HERE, not beside the function that produces it
 * (`_internal/server/features/orders/cancellation-refund.ts`), for one concrete
 * reason: appkit publishes no `./_internal/*` subpath, so a type declared there
 * is unreachable from the consumer — and the consumer is exactly who needs to
 * name it, because the API route and the buyer's cancel page both return and
 * render this value.
 *
 * It is returned rather than swallowed because *"₹2,499 is on its way back"* and
 * *"we owe you ₹2,499 and someone will send it"* are different sentences, and
 * a buyer who has just cancelled a paid order is entitled to the right one.
 * Before D14 the answer was always a bare 200 and `"Order cancelled"` — true,
 * and silent about the money, which is the defect.
 */
export type CancellationRefundOutcome =
  /** Nothing to refund: never captured, or already returned in full. */
  | { moved: "none"; why: "not-paid" | "nothing-refundable"; amount: 0 }
  /** Refunded through the gateway, once, keyed on the order. */
  | { moved: "gateway"; amount: number; refundId: string }
  /**
   * Owed and recorded, but no automatic rail could move it — a manual payment
   * method, a post-dispatch cancellation, or a gateway refusal. A
   * `manual_refund_due` case carries it to an operator; `caseId` is absent only
   * if that write itself failed, which never blocks the cancellation.
   */
  | {
      moved: "owed";
      amount: number;
      why: "post-dispatch" | "manual-payment" | "gateway-failed" | "no-gateway-reference";
      caseId?: string;
    };

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderListParams {
  userId?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sort?: string;
  page?: number;
  pageSize?: number;
}
