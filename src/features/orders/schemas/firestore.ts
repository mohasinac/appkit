/**
 * Orders Firestore Document Types & Constants
 */

import { generateOrderId } from "../../../utils/id-generators";
import type { OrderStatus, PaymentStatus } from "../types";
import type { OrderType } from "../utils/order-splitter";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { ListingType } from "../../products/types";
import type { StatusChangeEntry } from "../../../_internal/shared/history/index";
import type { ReturnReason } from "../../../_internal/shared/features/orders/return-reasons";
import type { ReturnCustodyState } from "../../../_internal/shared/features/returns/custody";
import type {
  ActualShipmentCost,
  SelectedShippingQuote,
  ShippingReconciliation,
} from "../../../_internal/shared/shipping/quote";
import type { Encrypted, Plaintext } from "../../../security/encrypted";

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
  /**
   * The product's LEAF category, snapshotted at order time (C1).
   *
   * 🛑 A SNAPSHOT, not a join, and not for performance alone. `priceIndexRollup`
   * needs to know which category band a realised sale belongs to, and this
   * interface carried no taxonomy field at all — `bundleCategorySlug` is a
   * bundle key, not a category — so the only route was a full products scan
   * per run, which answers nothing for an item whose product has since been
   * deleted.
   *
   * It is also the correct answer rather than the cheap one: a product
   * re-categorised next year must not retroactively move last year's sale into
   * a band it was never part of. Same reasoning as the `hsnCode` / `gstRate` /
   * `finalSale` snapshots below — a past sale's facts are fixed.
   *
   * Absent on every order written before C1, which is why the rollup keeps the
   * products-map fallback rather than treating absence as "no category".
   */
  categorySlug?: string;
  /**
   * The condition this unit was in AT THE TIME OF SALE.
   *
   * 🛑 Snapshotted for the same reason as `hsnCode` / `gstRate` / `finalSale` /
   * `categorySlug` above: reading `product.condition` at rollup time lets a
   * seller who refurbishes and relists the same slug retroactively re-file
   * every past sale under the new condition, and the per-condition price band
   * would then describe a market that never existed.
   *
   * Absent on every order written before this, which is why the rollup keeps
   * its products-map fallback rather than treating absence as a condition.
   */
  /**
   * I8 — the category's DISPLAY NAME at order time, beside `categorySlug`.
   *
   * 🛑 A slug survives a rename; a NAME does not. `categorySlug` alone lets the
   * price index band a past sale correctly, which is what it was added for —
   * but a receipt has to SHOW something, and re-resolving the name at render
   * time would make a renamed or deleted category change what a past invoice
   * says. Same reasoning as `hsnCode` / `gstRate` / `finalSale` above: a past
   * sale's facts are fixed.
   */
  categoryName?: string;
  /** I8 — the brand display name at order time, for the same reason. */
  brand?: string;
  condition?: string;
  /**
   * I9 — which physical variant of a PART this unit was, snapshotted.
   *
   * 🛑 Snapshotted for the same reason `condition` and `gstRate` are: the
   * price index slices by colourway, and reading the product's CURRENT
   * colourway would retroactively re-file an old sale under a value the seller
   * changed later. For a part this is a bigger price variable than condition —
   * the silver Metal Ball and the transparent-black one are the same mould
   * with the same stats, and one is rare and costly.
   */
  colourway?: string;
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
  /**
   * Whether THIS line was final sale at the moment of purchase.
   *
   * Snapshotted, exactly like `gstRate` and `hsnCode` above and for the same
   * reason: it is a term the buyer agreed to at checkout. Re-reading
   * `product.finalSale` at refund time would let a seller flip the switch
   * after the sale and retroactively refuse a return the buyer was promised —
   * or, in the other direction, lose a restriction the buyer accepted.
   *
   * ALWAYS an explicit boolean here, resolved through `isFinalSale()` by the
   * order-row builder, so no downstream reader has to know that absence means
   * true on the product. Absence HERE means the order predates the field.
   */
  finalSale?: boolean;
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
  /**
   * Human-readable reason, rendered by `RefundHistoryTable`. Derived from
   * `reasonCode` (plus any buyer note) rather than typed freehand, so the
   * prose and the code can never disagree about why a refund happened.
   */
  reason: string;
  /**
   * Coded reason. Optional only because refunds recorded before the enum
   * existed have none — every new refund sets it.
   */
  reasonCode?: ReturnReason;
  refundedAt: Date;
  refundedBy: string; // userId of admin / seller who issued the refund
  /**
   * Lifecycle of this refund entry. **Optional on purpose** — every row
   * written before the two-phase scheme (2026-10-21) has none, and those are
   * all committed refunds, so a missing status must COUNT as committed.
   *
   * · `reserved`  a slot was claimed and the provider call is in flight. The
   *               amount is already spoken for, so it counts toward the
   *               cumulative cap — that is what closes the TOCTOU.
   * · `processed` the provider confirmed. Money moved.
   * · `failed`    the provider refused. The reservation is RELEASED simply by
   *               being skipped in the cumulative sum, which is why there is
   *               no explicit release step to forget.
   *
   * A `reserved` entry that never settles is a crash between the provider call
   * and our write — detectable, and exactly what the reconciler looks for.
   */
  status?: "reserved" | "processed" | "failed";
  /** Why the provider refused, when `status === "failed"`. */
  failureReason?: string;
  /**
   * The gateway's own refund reference, whichever gateway ran.
   *
   * 🛑 ADDED 2026-10-21 because reconciliation was impossible (D7). Razorpay's
   * refund id was written to **`phonepeRefundId`** unconditionally — the
   * action did `phonepeRefundId = result.id` with no branch on provider — while
   * the declared `razorpayRefundId` was written by NOTHING, and
   * `RefundHistoryTable` rendered no reference at all for a Razorpay refund.
   * So a refund existed in Razorpay's dashboard with no way to tie it to ours.
   *
   * This is the field a reconciler reads, and it is gateway-BLIND on purpose:
   * a reconciler that has to know which provider ran before it can find the id
   * is a reconciler that breaks on the next provider. The two
   * provider-specific fields below stay, populated only by the provider that
   * actually produced the id, for operators who search a specific dashboard.
   */
  gatewayRefundId?: string;
  /** Which gateway produced `gatewayRefundId` (`payment.name`). */
  gateway?: string;
  /** Set when PhonePe processed the refund. */
  phonepeRefundId?: string;
  /** Set when Razorpay processed the refund (`rfnd_…`). Mutually exclusive with `phonepeRefundId` — one online gateway runs at a time. */
  razorpayRefundId?: string;
  /** Set when refund was processed manually (offline). */
  manualTransactionId?: string;
  /** Proof document URL (via /api/media signed-URL flow). */
  proofDocumentUrl?: string;
  proofDocumentMimeType?: string;
  /** Required for Razorpay-override path ("failed auto-refund, settled manually"). */
  overrideReason?: string;
  /**
   * The credit note that documents this refund, e.g. `LIRCN/26-27/0001`
   * (Phase 7, D12).
   *
   * 🛑 Per REFUND EVENT, not per order — an order can legitimately be refunded
   * several times, and each reversal of tax needs its own numbered document
   * referencing the original invoice. That is why the allocation claim for a
   * credit note is keyed `${orderId}_${refundId}` while an invoice's is keyed
   * on the order alone: keying a credit note on the order would refuse the
   * second one.
   *
   * Only ever set on a refund that actually SETTLED. A `reserved` entry that
   * failed is not a reversal of anything, and numbering it would leave a
   * credit note in the series for money that never moved.
   */
  creditNoteNumber?: string;
  creditNoteIssuedAt?: Date;
  /** Private storage path — same no-public-URL rule as `invoiceStoragePath`. */
  creditNoteStoragePath?: string;
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

/**
 * `OrderDocument` with its PII as plain `string` — what the named repository
 * accessors return, and what a WRITE path accepts (the repository encrypts).
 *
 * `Plaintext<T>` is the one definition of this shape; see `security/encrypted.ts`.
 * It is deliberately NOT distinguishable from a MASKED value — `maskPii`
 * returns plain strings too, and no type can express "these characters are
 * asterisks". The distinction is which named method you called.
 */
export type OrderPlain = Plaintext<OrderDocument>;

export interface OrderDocument extends BaseDocument {
  /** Word-prefix search tokens. Derived on write; never fed by a PII field. */
  searchTxt?: string[];
  productId: string;
  productTitle: string;
  userId: string;
  userName: Encrypted<string>;
  userEmail: Encrypted<string>;
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
  /**
   * When the SELLER accepted the order — the first fact in the fulfilment
   * lifecycle, and it did not exist before Phase 5b.
   *
   * 🛑 D30: there was no seller-acceptance step at all. `customShipOrder`
   * requires `status === "confirmed"` and **nothing ever set `confirmed` on a
   * paid order** except an admin PATCH, while `onOrderCreate` wrote one admin
   * notification and stopped. So a seller could silently ignore a paid order
   * forever and no clock anywhere noticed.
   *
   * Its presence is what distinguishes "the seller has not looked at this yet"
   * from "the seller accepted it and has not packed it" — two different
   * obligations with two different deadlines (`seller-accept` then
   * `seller-dispatch`), which is unexpressible with a single status field.
   */
  acceptedAt?: Date;
  shippingDate?: Date;
  deliveryDate?: Date;
  /**
   * When the order was marked COMPLETE — the fact that awards points and
   * closes the dispute window.
   *
   * 🛑 Owner's rule, 2026-10-21: *"auto assigned after 7 days of delivery, when
   * order is marked complete; if review is given and order marked complete by
   * the buyer before — immediate disburse."*
   *
   * So there are two writers and they are not equivalent:
   *
   * | writer | when | `completedBy` |
   * |---|---|---|
   * | `obligationSweep` | 7 days after delivery, nothing contested | `"system"` |
   * | `markOrderCompleteAction` | the buyer, having left a review | their uid |
   *
   * The buyer's path is the FAST one — it skips the remaining wait, which is
   * what "immediate disburse" asks for. And because `payout-release` is
   * `blockedBy: ["order-complete", …]`, an early completion opens the seller's
   * payout gate early **with no extra mechanism**: the buyer confirming
   * satisfaction is exactly the signal a quiet period exists to wait for.
   *
   * A FACT, never a deadline — the 7-day deadline itself stays derived
   * (`deadlinesFor`), so changing the period does not need a backfill.
   */
  completedAt?: Date;
  /** `"system"` for the timer, or the buyer's uid for the fast path. */
  completedBy?: string;
  /**
   * When purchase points were credited for this order.
   *
   * ## 🛑 THE IDEMPOTENCY KEY, and it is the whole reason the award exists
   *
   * `pointsLedger` is append-only and `pointsRepository.append` takes no key,
   * so an append does not deduplicate itself. Completion has TWO triggers —
   * the buyer's fast path and the 7-day `order-complete` sweep — and a double
   * fire would credit twice **permanently, with no way to net it off.**
   *
   * Both triggers check this field before awarding and write it after, which
   * is the same mechanism `order.shippingReconciliation` already provides for
   * the points credit on shipping savings: the marker is written in the same
   * step as the credit precisely so it can be the key.
   *
   * It is also set on an order that earned ZERO (fully cancelled, zero value),
   * so the sweep stops revisiting it — "we looked and there was nothing to
   * give" is a decision, and leaving it unmarked re-reads that order on every
   * tick forever.
   */
  pointsAwardedAt?: Date;
  /**
   * How many points were credited. Recorded for the seller's payout deduction
   * and for explaining a balance, so neither has to re-derive a percentage of a
   * figure the order may since have changed.
   */
  pointsAwarded?: number;
  /**
   * Points SPENT on this order as part-payment, in points (1 point = ₹1).
   *
   * 🛑 Distinct from `pointsAwarded` directly above, which is what the buyer
   * EARNED. Both can be non-zero on one order — a buyer can pay partly with
   * points and still earn on the goods value — and conflating them would make
   * the ledger unexplainable in exactly the place it matters most.
   *
   * Written at order creation from `resolvePointsTender`, never from a request
   * body. The ledger's `redemption` entry is keyed on this order, so this field
   * and that entry must agree; the order carries it so a payout deduction and a
   * refund can both answer "how much of this was points" without re-deriving a
   * percentage of a total that may since have changed.
   */
  pointsApplied?: number;
  /**
   * What the buyer actually pays: `totalPrice − pointsApplied`.
   *
   * ## 🛑 THE FIGURE THE GATEWAY CAPTURES, and the one the guard compares
   *
   * `totalPrice` stays the full value of the order — that is what the invoice
   * declares and what GST is computed against, because points are a DISCOUNT
   * and not a reduction in the value of the supply (decision 5). `amountDue` is
   * the cash leg.
   *
   * Absent means "nothing was tendered", so every order written before this
   * existed reads correctly as `amountDue === totalPrice`. 🛑 Readers must use
   * `amountDue ?? totalPrice` rather than defaulting to 0 — treating absence as
   * zero would say every historical order was fully paid in points.
   */
  amountDue?: number;
  cancellationDate?: Date;
  cancellationReason?: string;
  /**
   * Why the buyer asked to return this order. Closed enum — see
   * `_internal/shared/features/orders/return-reasons`.
   *
   * `requestReturnAction` accepted a free-text reason and then discarded it
   * before writing, so until now an order could reach `return_requested` with
   * no recorded reason at all and the seller had nothing to act on.
   */
  returnReasonCode?: ReturnReason;
  /** Optional buyer elaboration alongside the coded reason. */
  returnReasonNote?: string;
  returnRequestedAt?: Date;

  // ── C5g: custody. Where the parcel is, and who owns the next step ─────────
  /**
   * The return's own state machine — `requested` → `approved` → `in_transit`
   * → `received` → `inspected` → `resolved`.
   *
   * 🛑 A SUB-STATUS, not five new `OrderStatus` members. `OrderStatus` keeps
   * its two return values (`return_requested` / `returned`) because it drives
   * nine status chips, the Active/Closed scope `Record`, badges and filters —
   * and five extra members would appear in all of them while applying only to
   * a return, all mapping to "Active", adding a chip and no information. See
   * `_internal/shared/features/returns/custody.ts` for the full argument.
   *
   * Absent on every order that has never had a return requested.
   */
  returnCustody?: ReturnCustodyState;
  /**
   * Where the buyer was told to send it — SNAPSHOTTED at approval.
   *
   * 🛑 Derived by `returnDestination()` and then frozen, never recomputed. The
   * inputs are `saleProtectionAddon` and the store's admin-granted
   * `returnsDirectToSeller`, and an admin flipping that flag while a parcel is
   * in the post must not retroactively change where the buyer was told to post
   * it. Same reasoning as every other snapshot on this document
   * (`hsnCode`/`gstRate`/`finalSale`/`condition`): a past instruction is fixed.
   */
  returnDestination?: "warehouse" | "seller";
  /** The address the buyer was given, resolved once and recorded verbatim. */
  returnAddress?: string;
  /**
   * When the seller APPROVED the return — the anchor the buyer's posting
   * deadline is measured from.
   *
   * 🛑 Added for Phase 5b, and its absence was load-bearing: without it, "the
   * buyer has 7 days to post an approved return" had nothing to count from, so
   * the only available anchor was `returnRequestedAt` — which starts the
   * buyer's clock while the seller is still deciding, i.e. a seller who takes
   * 48 hours to approve silently eats two days of the buyer's window.
   *
   * A FACT, never a deadline. Deadlines are derived (`deadlinesFor`), never
   * stored — a stored deadline needs a backfill and drifts from the policy the
   * day somebody edits one (Root Cause #42).
   */
  returnApprovedAt?: Date;
  /** Set when the buyer marks it posted; `in_transit` without one is a bug. */
  returnPostedAt?: Date;
  returnReceivedAt?: Date;
  /**
   * What a human found on opening it.
   *
   * 🛑 `finding` decides WHO PAYS and never whether a protected buyer is
   * refunded — see `adjudicateClaim`. If inspection could block a protected
   * refund then "no questions asked" is false, and this field would be
   * rebuilding the dead-badge problem one level up.
   */
  returnInspection?: {
    finding: "genuine" | "change-of-mind";
    note?: string;
    /** Actor uid only. 🛑 Never a name or an email — this document is not
     *  PII-encrypted on these paths and `statusHistory` carries the same rule. */
    inspectedBy?: string;
    inspectedAt?: Date;
  };
  /**
   * Which lines the buyer wants to return. Absent means the whole order —
   * the same convention `processRefundAction`'s `itemIds` already uses.
   */
  returnRequestedItemIds?: string[];
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
  /**
   * GST charged on the platform fee, in decimal rupees.
   *
   * 🛑 ADDED 2026-10-21 because its ABSENCE made a refund over-deduct by ~10x.
   *
   * This was computed at checkout (`gstOnFee`), charged to the buyer as its own
   * term in `orderTotal`, and then folded into `gstAmount` — so the order
   * recorded the combined figure and no field held the fee's own tax. The
   * platform fee is non-refundable by policy, so a refund has to withhold
   * `platformFee + its GST`, and with the second half unavailable
   * `previewCancellationRefund` re-derived BOTH from live percentages:
   *
   *     effectiveRate = platformFeePercent × (1 + gstPercent / 100)
   *     feeDeducted   = grossRefund × effectiveRate / 100
   *
   * That ignores `commissions.platformFeeMax` (default **₹10**) entirely, so on
   * a ₹5,000 order it withheld **₹118** from a buyer who had paid **₹11.80** —
   * keeping ~₹106 of their goods money and calling it a platform fee. The
   * error grows with order value.
   *
   * Stored rather than re-derived for the same reason every other agreed term
   * is: the rate in force when the order was placed is the rate that governs
   * it. `platformFeeWithheld()` reads this field and falls back to deriving it
   * only for orders written before it existed.
   *
   * 🛑 Note the ASYMMETRY with product GST, which is deliberate: product
   * prices are tax-INCLUSIVE so their tax is backed out for reporting, while
   * this is GST on OUR service fee charged to the buyer ON TOP of the fee. See
   * the note above `orderTotal` in `createOrderForGroup`.
   */
  platformFeeGst?: number;
  depositAmount?: number;
  codRemainingAmount?: number;
  /** COD handling fee charged to the buyer: min(subtotal × codHandlingFeePercent / 100, codHandlingFeeCap). Only set when paymentMethod === "cod". */
  codHandlingFee?: number;
  /** Buyer opted into gift wrapping at checkout (unchecked by default). */
  giftWrapAddon?: boolean;
  /** Fee charged for gift wrap, decimal rupees — snapshot of siteSettings.commissions.giftWrapFee at order time. */
  giftWrapFee?: number;
  /** Optional buyer-written gift message, shown to the seller for fulfilment. Capped length. */
  giftWrapMessage?: string;
  /** Buyer opted into shipment protection (loss/damage IN TRANSIT) at checkout (unchecked by default). */
  shipmentProtectionAddon?: boolean;
  /** Fee charged for shipment protection, decimal rupees — snapshot of siteSettings.commissions.shipmentProtectionFeePercent/Min at order time. */
  shipmentProtectionFee?: number;
  /**
   * Buyer opted into SALE protection — the item itself, not the transit (C5e).
   *
   * 🛑 These two flags are what a claim reads, and they are the record that the
   * three tiers passed at the time of sale. A seller who later withdraws
   * `supportsSaleProtection`, or an admin who disables the add-on
   * platform-wide, must not retroactively void cover already paid for — which
   * is why eligibility at claim time reads THIS field and
   * `OrderDocumentItem.finalSale`, never the live store or product.
   */
  saleProtectionAddon?: boolean;
  /** Fee charged for sale protection, decimal rupees — snapshot of siteSettings.commissions.saleProtectionFeePercent/Min at order time. */
  saleProtectionFee?: number;

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
  /**
   * Taxable value of 0%-rated (EXEMPT) goods in this order — live plants and
   * animals. **Not** part of `taxableAmount`, which covers positively-rated
   * slices only.
   *
   * 🛑 Without it a mixed exempt/taxed order cannot reconcile its own invoice:
   * `sumGroupGst` skipped exempt slices entirely, so `taxableAmount` excluded
   * them while `items[]` included them, and the Taxable column could never
   * sum to the summary. Exempt is a real, reportable state (nil-rated supply),
   * not an absence.
   */
  exemptAmount?: number;
  /**
   * Per-rate rollup — taxable value and tax for each distinct `gstRate` in the
   * order.
   *
   * 🛑 Required for a Rule 46-compliant invoice, which asks for taxable value
   * and tax **per rate**. The aggregate `taxableAmount`/`gstAmount`/cgst/sgst/
   * igst fields above lose that dimension, so a mixed 5% + 18% order could not
   * produce a compliant document without re-deriving the split downstream —
   * i.e. a second implementation of the loop that already computed it.
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
   * The buyer's state — the PLACE OF SUPPLY (Phase 7).
   *
   * 🛑 This is the input the CGST/SGST-vs-IGST decision was made FROM, and it
   * was not recorded anywhere. `isIntraStateSupply(buyerState, storeState)`
   * runs at checkout and only its *result* survived, in the shape of which tax
   * fields got populated — so an order could not state why it split the way it
   * did, and GSTR-1 has a mandatory place-of-supply column that nothing could
   * fill.
   *
   * `shippingAddress` is a flat STRING on this document and contains the state
   * somewhere inside it; parsing a state back out of free text to file a tax
   * return is not a thing to do. The value is in scope at order creation, so
   * it is written there.
   *
   * Absent on orders placed before this, which the export reports rather than
   * silently blanks.
   */
  placeOfSupply?: string;
  /**
   * OUR GST registration as it stood at the moment of supply — LetItRip is the
   * seller of record and invoices under its own GSTIN.
   *
   * 🛑 Snapshotted for two independent reasons, and both matter.
   *
   * **Compliance**: changing our registered details must never rewrite an
   * invoice already issued. Same discipline as `items[].hsnCode` / `gstRate` /
   * `finalSale`, and the same reason `TaxCodeDocument` edits change future
   * derivations only.
   *
   * **Access**: `gst` sits in `PRIVATE_SITE_FIELDS` — withheld from the public
   * site-settings projection precisely because an earlier deny-list version
   * shipped the GSTIN and registered legal name to anonymous callers (Root
   * Cause #70). So the invoice page cannot read it from site settings, and it
   * should not: the buyer is entitled to the GSTIN *on their own invoice*,
   * which is an authenticated per-order read, not public data.
   */
  supplierGstin?: string;
  supplierLegalName?: string;
  supplierAddress?: string;

  // ── Invoicing (Phase 7, D12) ───────────────────────────────────────────────
  /**
   * The invoice number from the gapless FY series, e.g. `LIR/26-27/0001`.
   *
   * 🛑 Allocated on `paymentStatus → paid`, never at order creation — a number
   * burned on an abandoned COD order is a gap nobody can explain. Written once
   * and never rewritten: a GST invoice is issued once, and an adjustment is a
   * CREDIT NOTE, not a re-issue.
   *
   * Absence means "not yet invoiced", which is the correct state for a pending
   * order and for every order placed before this phase.
   */
  invoiceNumber?: string;
  /** When the number was allocated — the invoice's own date. */
  invoiceIssuedAt?: Date;
  /**
   * Where the rendered PDF lives.
   *
   * 🛑 **`private/invoices/{orderId}/{uuid}.pdf`, with NO `mediaAssets` row and
   * a RANDOM object name.** An invoice carries the buyer's full name, address
   * and phone. `/api/media/[...slug]` applies **no authentication** over a
   * bucket whose storage rule is `allow read: if true`, and the slug resolves
   * through `mediaAssets` — so no row means no public URL exists at all.
   *
   * The random name is deliberately AGAINST the content-derived SEO-slug
   * convention used everywhere else in this codebase, because guessable is the
   * one property this must not have. `generateInvoiceFilename` is
   * content-derived and is therefore the wrong tool here. Same reasoning as the
   * digital-content decision (D103).
   */
  invoiceStoragePath?: string;

  // ── Shared purchase, S5a (one payer, N destinations) ───────────────────────
  /**
   * The arrangement's fees, SNAPSHOTTED at checkout.
   *
   * 🛑 Snapshotted, not re-read. A coordinator commits against a quoted total;
   * if the rates were read again at settle a seller could raise them
   * afterwards and the coordinator would absorb it. The precedent is exact —
   * the refund path reads `finalSale` from this document rather than the live
   * product, "because re-reading the live product would let a seller flip the
   * switch afterwards" — and D61 generalises it to every agreement with a gap
   * between terms-agreed and money-taken.
   *
   * Absent on every ordinary single-destination order, which is almost all of
   * them.
   */
  sharedPurchase?: {
    /** Distinct destinations, including the first. Always ≥ 2 when present. */
    destinationCount: number;
    /** Flat per-arrangement fee, as charged. */
    handlingFee: number;
    /** Extra shipping for destinations beyond the first, as charged. */
    extraShippingFee: number;
  };

  // ── EMI (installment) fields — only set when paymentMethod === "emi" ────────
  emiEnabled?: boolean;
  /** Number of monthly installments the buyer chose (2–6). */
  emiTenureMonths?: number;
  /** Down payment collected at checkout, in decimal rupees (emiTokenPercent × seller subtotal). */
  emiTokenAmount?: number;
  /** Extra cost of choosing EMI over full payment, in decimal rupees — split between platform and seller. */
  emiSurchargeAmount?: number;
  /**
   * The SELLER's share of the EMI surcharge, in decimal rupees.
   *
   * 🛑 D45, the half that is a data gap rather than a commercial decision.
   * `computeEmiSchedule` computes `surchargeSellerShare` (from
   * `emi.surchargeSellerSharePercent`, seeded at 50) and it was **persisted
   * nowhere** — so the split existed as a setting, a form field and a returned
   * value with no field to land in and therefore no reader in the payout path.
   * The platform kept 100% of a surcharge it had already decided to split.
   *
   * 🛑 Persisting it moves NO money on its own, and that is deliberate.
   * Whether the seller is actually PAID this — along with shipping and the COD
   * handling fee, the other two D45 terms — is a commercial decision about who
   * keeps which revenue, and it is the owner's to make, not a defect to quietly
   * fix. What was broken is that the decision had already been made (the
   * setting exists, defaulted to 50%) and the number was then thrown away. Now
   * it is recorded, so honouring it is a payout change rather than an
   * archaeology exercise.
   */
  emiSurchargeSellerShare?: number;
  emiInstallments?: EmiInstallment[];
  /** Sum of unpaid installment amounts, in decimal rupees. 0 once all installments are paid. */
  emiRemainingBalance?: number;
  /** True once every installment's status is "paid". Gates shipment unless the product's `allowShipBeforeEmiComplete` flag is set. */
  emiComplete?: boolean;

  shippingFee?: number;
  shippingMethod?: ShippingMethod;
  shippingCarrier?: string;
  trackingUrl?: string;
  /**
   * The courier the BUYER picked at checkout, and what they were charged for
   * it, frozen at order creation.
   *
   * 🛑 Stored, never recomputed. Carrier rates move hourly, so re-quoting at
   * reconciliation time would compare the seller's real spend against a price
   * nobody was ever charged, and the buyer's refund would depend on when a job
   * happened to run. Same reasoning as `sourceContext`.
   *
   * `chargedRate` is the ₹50-rounded figure and is the ONLY one that is
   * billed; `rawRate` is kept for the audit trail and is never rendered.
   * Absent on orders placed before the picker shipped, and on any order whose
   * seller ships manually — so every reader must treat absence as "no quote
   * was taken", never as zero.
   */
  selectedShippingQuote?: SelectedShippingQuote;
  /**
   * What the seller actually spent on postage, recorded at dispatch.
   *
   * Written by the seller's ship action. Its presence is what makes an order
   * eligible for reconciliation; its absence means the parcel has not been
   * dispatched or the seller has not told us what it cost.
   */
  actualShipmentCost?: ActualShipmentCost;
  /**
   * The outcome of comparing the two above — computed ONCE, when the seller
   * dispatches, and then left alone.
   *
   * 🛑 Its presence is the idempotency key for the points credit. Crediting is
   * an append to a ledger, so a job that ran twice would pay the buyer twice
   * and nothing downstream could tell the difference between that and two
   * genuine savings. Every writer must check this field is unset before
   * writing a `shipping_saving` entry.
   */
  shippingReconciliation?: ShippingReconciliation & { reconciledAt: Date };
  /**
   * Did WE book this shipment through the Shiprocket integration?
   *
   * 🛑 The discriminator for whether postage may be reimbursed at all, and it
   * must be a fact about the BOOKING rather than about the evidence — see
   * `isReimbursableShipment`. If reimbursement were gated on "a receipt
   * exists", a seller could upload a receipt for a parcel the platform paid
   * for and be reimbursed for our spend.
   *
   * Written by the integration at booking time. Absent means nobody recorded a
   * platform booking, which for a self-shipped parcel is correct and still
   * requires evidence and approval before anything is paid.
   */
  platformBookedShipment?: boolean;
  /**
   * We tried to book a courier for this order and could not.
   *
   * ## 🛑 ITS WHOLE PURPOSE IS TO STOP AN AUTO-CANCELLATION
   *
   * `seller-dispatch` is an `onDue: "act"` obligation on a 2-business-day
   * clock. Without this field, an order sitting on OUR empty courier wallet is
   * auto-cancelled and the buyer refunded — with the seller recorded as having
   * failed to dispatch. The buyer paid, the seller did nothing wrong, and the
   * platform's own funding state caused the cancellation.
   *
   * So every `onDue: "act"` policy anchored at or after dispatch gates its
   * `precondition` on `!hasOpenCourierBlock(order)`. The obligation engine
   * re-evaluates `precondition` at fire time and closes `superseded` when it
   * returns false, so the clock pauses and resumes with no new mechanism.
   *
   * Absent means no block — which is every order ever written, so this needs
   * no migration and changes nothing until something sets it.
   *
   * `reason` is the operator's word, not the seller's: the seller is told only
   * that we could not book a courier right now, because our balance is our
   * problem and not theirs.
   */
  courierBlock?: {
    reason: "insufficient_funds" | "provider_error" | "unserviceable";
    at: Date;
    lastAttemptAt?: Date;
    /** Attempts so far, so the digest can distinguish stuck from transient. */
    attempts: number;
    /** Upstream detail, for the admin surface only. Never shown to a seller. */
    detail?: string;
  };
  /**
   * The self-shipped reimbursement workflow: evidence in, approved amount out.
   *
   * ## 🛑 `declaredAmount` is an ESTIMATE; `approvedAmount` is the entitlement
   *
   * Owner, 2026-10-21: *"The seller may set an initial value of shipping but
   * the only approved amount will be given to them."* So a seller who quotes
   * ₹120 and posts for ₹80 is reimbursed ₹80 — the two numbers are different
   * things and must never be conflated, which is why they are separate fields
   * rather than one that gets overwritten.
   *
   * `approvedAmount` is absent until an admin approves. A missing value means
   * "not yet decided", never zero: defaulting it to 0 would make an
   * un-reviewed claim indistinguishable from a rejected one, and the payout
   * base reads this field.
   *
   * 🛑 **`approvedBy` must never be `"system"`.** Approving a reimbursement
   * moves money to a seller on the strength of a document a human has to look
   * at. Same rule, and the same reason, as `paymentCases.resolve()` refusing a
   * system resolver.
   */
  shippingReimbursement?: {
    /** What the seller says it cost. An estimate, not an entitlement. */
    declaredAmount: number;
    /** Receipt / postage slip. Uploaded by the seller. */
    evidenceUrl?: string;
    /** The tracking number on that receipt — ties the evidence to the parcel. */
    trackingNumber?: string;
    submittedAt: Date;
    /** Present only once an admin has decided. Absent ≠ zero. */
    approvedAmount?: number;
    approvedBy?: string;
    approvedAt?: Date;
    /** Required when the approved amount differs from the declared one. */
    approvalNote?: string;
  };
  /**
   * The carrier's label PDF, once a shipment has been booked.
   *
   * 🛑 DECLARED 2026-10-11, and the reason is that it was being READ without
   * being declared. `GET /api/user/orders/[id]/label` reached it through an
   * inline `(order as { shippingLabelUrl?: string })` cast — a cast at a
   * boundary, which is where this class of bug lives (Root Cause #70/#98) — so
   * the field existed in exactly one expression, on no schema, with no writer.
   * That route could therefore only ever return its 404 branch, and nothing
   * said so: `tsc` cannot check a field nobody declared, and a 404 from a
   * "download label" button reads as "not shipped yet" rather than as a route
   * that cannot succeed.
   *
   * Declaring it is the part that can be done and verified now. 🛑 It still has
   * NO WRITER — `ManualShippingProvider.generateLabel` throws, and the
   * Shiprocket provider that would populate it cannot be built against the live
   * API without credentials (C5c). So the route's 404 remains correct for every
   * order today; what changes is that the field is now type-checked, and
   * whatever writes it will be caught by the compiler rather than by a cast.
   */
  shippingLabelUrl?: string;
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
  /**
   * Marks an order created by the tester harness.
   *
   * 🛑 DECLARED LATE: three readers already depended on it —
   * `deadlinesFor()`, `protection-claims/actions.ts` and
   * `orders.repository.ts` — while `OrderDocument` never carried the field,
   * so all three were type errors. The intent is documented in
   * `obligations/deadlines.ts`: a test order COMPRESSES its obligation
   * windows, so a tester can watch a deadline lapse inside one run instead of
   * waiting the real number of days.
   *
   * 🛑 This does NOT enrol orders in the test-data purge. `runTestDataCleanup`
   * deliberately leaves `orders`/`reviews`/`wishlists`/`history` alone — they
   * denormalise what they display, so a swept order would leave a
   * half-rendered row rather than disappear. The flag is read for timing, not
   * for deletion, and adding it to `TEST_DATA_COLLECTIONS` would be a
   * different and much larger decision.
   *
   * Optional, so no migration: every existing order reads `undefined`, which
   * `deadlinesFor` tests with `=== true`.
   */
  isTestData?: boolean;
}

export type OrderPaymentRecordMethod = "manual" | "phonepe" | "razorpay" | "cod";
export type OrderPaymentVerificationMethod = "manual_review" | "webhook" | "cod_collection" | "order_status";

export interface OrderPaymentRecord {
  method: OrderPaymentRecordMethod;
  /** UTR (manual) | PhonePe transactionId / Razorpay `pay_…` (gateway) | collector note/ref (COD). */
  transactionId?: string;
  /** Manual proof upload | COD collection receipt photo (optional) | n/a for a gateway. */
  proofUrl?: string;
  amount: number;
  paidAt?: Date;
  /** Admin/seller uid (manual/COD) | "{gateway}-order-status" or "{gateway}-webhook" (automatic). */
  verifiedBy?: string;
  verificationMethod: OrderPaymentVerificationMethod;
  /**
   * Gateway audit trail only.
   *
   * `merchantOrderId` is the id this codebase stores as `order.paymentId` and
   * keys every lookup on, whichever gateway is live — PhonePe's own
   * `merchantOrderId`, or Razorpay's `order_…`. The provider-specific fields
   * below record the gateway's extra ids when it has them.
   */
  gatewayRef?: {
    merchantOrderId?: string;
    phonepeOrderId?: string;
    razorpayOrderId?: string;
    /** Razorpay's payment id (`pay_…`) — the key its refund API needs. */
    razorpayPaymentId?: string;
    transactionId?: string;
  };
}

export const ORDER_COLLECTION = "orders" as const;

/**
 * At-most-once gate for refunds. Document id = `sha256(idempotencyKey)`,
 * claimed with `.create()` BEFORE any provider call.
 *
 * 🛑 A claim is deliberately NOT released on failure. Surviving a crash is the
 * whole point: it stops a retry from issuing a second provider call for a
 * refund that may already have succeeded at the gateway. An unsettled claim
 * older than an hour is a crash between "provider called" and "entry settled",
 * and resolving it means READING the gateway, never guessing — that is Phase
 * 4's R3 reconciler.
 *
 * Classified **PRESERVE** in the tester tier (`tester/scripts/lib/collections.mjs`)
 * because it is the only record that a refund was attempted and wiping it
 * would let a replay re-refund.
 *
 * 🛑 It deliberately gets NO `SEED_COLLECTION_PURPOSE` entry, and that is not
 * an oversight. `audit-seed-purpose`'s R1 requires that registry to match
 * `COLLECTION_MAP` EXACTLY in both directions — a key for a collection the
 * seeder never writes is a DEAD entry, the same shape as the `offers` entry in
 * `TEST_DATA_COLLECTIONS` that could only ever match zero rows while reading
 * as coverage. This collection has no seed data, so the tester tier is the
 * only list it belongs in. (I added it to both first; R1 would have failed.)
 */
export const REFUND_CLAIMS_COLLECTION = "refundClaims" as const;

export const ORDER_INDEXED_FIELDS = [
  "searchTxt",
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

/*
 * 🛑 Derived from the PLAIN shape. The caller holds the buyer's real name and
 * email and this repository encrypts them; deriving from the document demanded
 * `Encrypted<string>` from checkout, satisfiable only by `asEncrypted(email)`.
 */
export type OrderCreateInput = Omit<
  OrderPlain,
  "id" | "createdAt" | "updatedAt" | "orderDate"
>;
export type OrderUpdateInput = Partial<
  Pick<OrderDocument, (typeof ORDER_UPDATABLE_FIELDS)[number]>
>;
/*
 * Derived from the PLAIN shape: an admin form supplies real values and the
 * repository encrypts them on write. Deriving from the document demanded
 * `Encrypted<string>` from the admin action, which nobody has.
 */
export type OrderAdminUpdateInput = Partial<
  Omit<OrderPlain, "id" | "createdAt">
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
