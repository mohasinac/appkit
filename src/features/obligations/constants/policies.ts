/**
 * `OBLIGATION_POLICIES` — the ONE place a lifecycle duration lives.
 *
 * ## What this replaces
 *
 * Durations were scattered across hardcoded constants, dead `siteSettings`
 * fields, and published FAQ prose that disagreed with all of them. The plan's
 * own audit of it found eighteen dead timer settings (D28/D44/D57/D60) and
 * these live contradictions:
 *
 * | fact | code said | the FAQ said | a guide said |
 * |---|---|---|---|
 * | seller return response | nothing enforced | 48 hours | 3 days |
 * | offer checkout deadline | 48h | 24h | — |
 * | return window | `ORDER_RETURN_WINDOW_DAYS` = 7 | 7 days / 2 days / 48h | — |
 *
 * `publishedCopyKey` is the half that fixes that: Phase 9 renders the number
 * from HERE, so published copy **cannot** disagree with the code. A duration
 * changed in this file changes the policy page, the FAQ and the sweep together.
 *
 * ## `deadlinesFor(order)` is a PURE FUNCTION over this registry
 *
 * So a buyer or seller page can render "Dispatch by Thu 3 Nov" with **zero
 * extra reads**. That is strictly better than storing deadline fields on the
 * order, which would need a backfill and would drift from the policy the day
 * somebody edited one — the mirror trap (Root Cause #42).
 *
 * ## 🛑 Every duration here is a DEFAULT, and `settingPath` says which admin
 * field overrides it
 *
 * A duration with no reader is a dead setting; a setting with no duration is a
 * control that silently does nothing. `platformLimits`' own comment states the
 * rule its three deleted siblings were removed under: *"Do not re-add them
 * without a reader: a control that silently does nothing is worse than an
 * absent one."* This registry is the reader.
 */

import {
  ORDER_RETURN_WINDOW_DAYS,
  ORDER_AUTO_CONFIRM_DAYS,
} from "../../../_internal/shared/features/orders/config";
import { PROTECTION_CLAIM_WINDOW_HOURS } from "../../../_internal/shared/features/shipping/protections";
import { PAYMENT_WINDOW_MINUTES } from "../../orders/constants/payment-window";
import type { OrderDocument } from "../../orders/schemas/firestore";
import type { ObligationDueAction, ObligationKind } from "../schemas/firestore";

export type DurationUnit = "minutes" | "hours" | "days";

export interface Duration {
  value: number;
  unit: DurationUnit;
  /**
   * `business` counts weekends and the Indian holiday calendar; `calendar` is
   * wall-clock.
   *
   * 🛑 These are NOT interchangeable and the distinction was a live bug:
   * `getBusinessDayCutoff` subtracted CALENDAR days and called them business
   * days, so the "7-business-day" payout hold was really about 5 — four
   * calendar days short of what it promised. A duration that says `business`
   * must go through `addBusinessDays`.
   */
  calendar: "calendar" | "business";
}

export interface ObligationPolicy {
  /** Which fact starts the clock. `null` means the clock is not running yet. */
  anchor: (order: OrderDocument) => Date | null | undefined;
  duration: Duration;
  /** Warn this long BEFORE it fires, so the deadline is visible in advance. */
  warnAt?: readonly Duration[];
  /**
   * Re-checked at FIRE time, against a freshly-read subject.
   *
   * 🛑 This is what makes the collection an index rather than truth. A
   * `seller-accept` obligation whose order has since been paid-and-accepted
   * returns `false` here and closes `superseded` — no action, no case, no
   * noise.
   */
  precondition: (order: OrderDocument) => boolean;
  /** Kinds that must be closed before this one may fire. */
  blockedBy?: readonly ObligationKind[];
  /** The guardrail tier. See `ObligationDueAction`. */
  onDue: ObligationDueAction;
  /** The `siteSettings` path an admin can override the duration with. */
  settingPath?: string;
  /** The copy key Phase 9 renders this duration into. */
  publishedCopyKey: string;
  /** One line for an operator reading a case opened from this kind. */
  describe: string;
}

const isPaid = (o: OrderDocument): boolean => o.paymentStatus === "paid";
const notTerminal = (o: OrderDocument): boolean =>
  o.status !== "cancelled" && o.status !== "refunded";

/**
 * 🛑 `shippingDate != null` IS THE DISCRIMINATOR for before/after dispatch,
 * not the status set — and this is the single highest-value line in the whole
 * obligation design.
 *
 * "Cancel before dispatch" and "cancel after dispatch" are different events
 * with different money: before, the buyer gets everything back; after, the
 * buyer bears outbound shipping and it becomes a return. Today
 * `assertOrderCancellable` just throws *"Only pending or confirmed orders can
 * be cancelled"* and offers the buyer nothing — because it discriminates on
 * STATUS, which cannot express "has the parcel physically left".
 */
const hasDispatched = (o: OrderDocument): boolean => Boolean(o.shippingDate);

export const OBLIGATION_POLICIES: Record<ObligationKind, ObligationPolicy> = {
  /*
   * ── PRE-DISPATCH ─────────────────────────────────────────────────────────
   */

  /**
   * The seller never accepts. **3 calendar days**, the figure the owner gave.
   *
   * 🛑 D30: there IS no seller-acceptance step today. `customShipOrder`
   * requires `status === "confirmed"`, and **nothing ever sets `confirmed` on a
   * paid order** except an admin PATCH — `onOrderCreate` writes one admin
   * notification and stops. So this obligation is the first thing in the
   * system that notices a seller ignoring an order.
   *
   * `act`: the ceiling is what we captured, the recipient is the payer, and
   * the seller is not debited — they simply forfeit the sale. The platform
   * absorbs the gateway fee, which is the cost of the seller's inaction and
   * not the buyer's problem.
   */
  "seller-accept": {
    anchor: (o) => o.orderDate ?? o.createdAt,
    duration: { value: 3, unit: "days", calendar: "calendar" },
    warnAt: [{ value: 24, unit: "hours", calendar: "calendar" }],
    precondition: (o) => isPaid(o) && notTerminal(o) && !o.acceptedAt && !hasDispatched(o),
    onDue: "act",
    publishedCopyKey: "obligations.sellerAccept",
    describe: "The seller did not accept this order within the acceptance window.",
  },

  /**
   * Accepted but never dispatched. **2 business days**, because a weekend is
   * not a seller ignoring you.
   */
  "seller-dispatch": {
    anchor: (o) => o.acceptedAt,
    duration: { value: 2, unit: "days", calendar: "business" },
    warnAt: [{ value: 8, unit: "hours", calendar: "calendar" }],
    precondition: (o) => isPaid(o) && notTerminal(o) && !hasDispatched(o),
    blockedBy: ["seller-accept"],
    onDue: "act",
    publishedCopyKey: "obligations.sellerDispatch",
    describe: "The seller accepted this order but did not dispatch it in time.",
  },

  /**
   * A rejected payment proof the buyer never replaced.
   *
   * 🛑 THIS IS THE D27 FIX. An order in `reupload_requested` was caught by
   * ZERO sweeps — excluded by all three because it has a proof, has an
   * outcome, and has a deadline — so it held stock forever with no terminal
   * state. One policy row replaces the reasoning that failed.
   */
  "proof-reupload": {
    anchor: (o) => o.paymentReviewedAt,
    duration: { value: 24, unit: "hours", calendar: "calendar" },
    warnAt: [{ value: 4, unit: "hours", calendar: "calendar" }],
    precondition: (o) =>
      o.paymentReviewOutcome === "reupload_requested" && notTerminal(o) && !isPaid(o),
    onDue: "act",
    settingPath: "platformLimits.proofReuploadWindowHours",
    publishedCopyKey: "obligations.proofReupload",
    describe: "The buyer did not re-upload a payment proof after one was rejected.",
  },

  /*
   * ── IN TRANSIT ───────────────────────────────────────────────────────────
   */

  /**
   * Nobody ever confirms delivery. **14 days** — which is what the dead
   * `ORDER_AUTO_CONFIRM_DAYS` constant was for, and this is its first reader.
   *
   * 🛑 Ordered BEFORE everything post-delivery, because it PRODUCES the anchor
   * those depend on (`deliveryDate`). And `blockedBy` is load-bearing here: a
   * parcel lost in transit must not auto-confirm, open a return window, and
   * start the seller's payout clock. A transit claim blocks it.
   */
  "delivery-confirm": {
    anchor: (o) => o.shippingDate,
    duration: { value: ORDER_AUTO_CONFIRM_DAYS, unit: "days", calendar: "calendar" },
    precondition: (o) => hasDispatched(o) && !o.deliveryDate && notTerminal(o),
    blockedBy: ["claim-shipping"],
    onDue: "act",
    settingPath: "platformLimits.autoConfirmDeliveryDays",
    publishedCopyKey: "obligations.deliveryConfirm",
    describe: "Delivery was never confirmed, so it is being recorded as delivered.",
  },

  /*
   * ── RETURNS ──────────────────────────────────────────────────────────────
   */

  /**
   * The seller ignores a return request.
   *
   * 🛑 **48 hours, and this number settles a live contradiction**: the FAQ
   * says the seller has 48 hours, `AdminOrdersGuideView` says 3 days, and
   * nothing enforced either. Picking one and rendering it everywhere via
   * `publishedCopyKey` is the point — 48h is the shorter, so it is the one
   * that cannot make us look like we broke a published promise.
   *
   * `act`: auto-approving a return the seller ignored refunds the BUYER from
   * money we hold. The seller-side consequence is a separate decision and is
   * NOT taken here.
   */
  "return-respond": {
    anchor: (o) => o.returnRequestedAt,
    duration: { value: 48, unit: "hours", calendar: "calendar" },
    warnAt: [{ value: 12, unit: "hours", calendar: "calendar" }],
    precondition: (o) => o.status === "return_requested" && !o.returnPostedAt,
    onDue: "act",
    settingPath: "returns.sellerResponseHours",
    publishedCopyKey: "obligations.returnRespond",
    describe: "The seller did not respond to this return request in time.",
  },

  /** Return approved, buyer never posts it. No refund; the window does not reopen. */
  "return-post": {
    anchor: (o) => o.returnApprovedAt,
    duration: { value: ORDER_RETURN_WINDOW_DAYS, unit: "days", calendar: "calendar" },
    warnAt: [{ value: 2, unit: "days", calendar: "calendar" }],
    precondition: (o) => Boolean(o.returnApprovedAt) && !o.returnPostedAt,
    blockedBy: ["return-respond"],
    onDue: "act",
    settingPath: "returns.windowDays",
    publishedCopyKey: "obligations.returnPost",
    describe: "The buyer did not post the return within the window.",
  },

  /** Posted but never arrives — a transit problem, so a human looks. */
  "return-receive": {
    anchor: (o) => o.returnPostedAt,
    duration: { value: 10, unit: "days", calendar: "calendar" },
    precondition: (o) => Boolean(o.returnPostedAt) && !o.returnReceivedAt,
    blockedBy: ["return-post"],
    onDue: "escalate",
    publishedCopyKey: "obligations.returnReceive",
    describe: "A posted return never arrived at the seller.",
  },

  /**
   * Received but never inspected. **3 business days, then the buyer wins.**
   *
   * 🛑 `act` on the BUYER side only. The buyer is refunded automatically
   * because the seller had three business days and did nothing; the seller is
   * **charged only by a human**, which is why there is no seller-debit here.
   * Those are two different decisions and the plan's guardrail table keeps
   * them apart deliberately.
   */
  "return-inspect": {
    anchor: (o) => o.returnReceivedAt,
    duration: { value: 3, unit: "days", calendar: "business" },
    warnAt: [{ value: 1, unit: "days", calendar: "business" }],
    precondition: (o) => Boolean(o.returnReceivedAt) && !o.returnInspection?.inspectedAt,
    blockedBy: ["return-receive"],
    onDue: "act",
    settingPath: "returns.inspectionBusinessDays",
    publishedCopyKey: "obligations.returnInspect",
    describe: "A received return was never inspected, so it resolves in the buyer's favour.",
  },

  /*
   * ── PROTECTION CLAIM WINDOWS ─────────────────────────────────────────────
   *
   * 🛑 These make the add-on REAL for the first time. We charge 2% (min ₹30)
   * shipment protection and 3% (min ₹49) sale protection, the flags are seeded
   * `true`, and `adjudicateClaim()` has existed with zero callers — so the fee
   * was collected against a promise with no mechanism (D11).
   *
   * Closing the window is what makes the premium EARNED, which is also what
   * the payout hold waits for. `act`, because closing a window moves no money.
   */
  "claim-shipping": {
    anchor: (o) => o.deliveryDate,
    duration: {
      value: PROTECTION_CLAIM_WINDOW_HOURS.shipping,
      unit: "hours",
      calendar: "calendar",
    },
    precondition: (o) => Boolean(o.deliveryDate) && Boolean(o.shipmentProtectionFee),
    onDue: "act",
    publishedCopyKey: "obligations.claimShipping",
    describe: "The shipment-protection claim window has closed.",
  },

  "claim-sale": {
    anchor: (o) => o.deliveryDate,
    duration: {
      value: PROTECTION_CLAIM_WINDOW_HOURS.sale,
      unit: "hours",
      calendar: "calendar",
    },
    precondition: (o) => Boolean(o.deliveryDate) && Boolean(o.saleProtectionFee),
    onDue: "act",
    publishedCopyKey: "obligations.claimSale",
    describe: "The sale-protection claim window has closed.",
  },

  /*
   * ── COMPLETION ───────────────────────────────────────────────────────────
   */

  /**
   * 7 days after delivery with no issue raised: the order is COMPLETE, points
   * are awarded, and no NEW dispute may be opened.
   *
   * 🛑 Owner's requirement, 2026-10-21. Two things about it need stating
   * because getting either wrong changes the product:
   *
   * **1. "No further disputes entertained" means NO NEW DISPUTE MAY BE RAISED
   * — it cannot mean "everything closes at 7 days".** A return requested on
   * day 6 still has to be approved, posted, received and inspected, which takes
   * weeks; and `claim-sale`'s window is itself 168h = exactly 7 days. Reading
   * it as a hard close would cancel in-flight returns the buyer raised in time,
   * which is the opposite of what a dispute window is for. So this fires a
   * CUTOFF for new claims and leaves open ones running — and `precondition`
   * below is what makes that true, by refusing to fire while anything is still
   * in flight.
   *
   * **2. The award must be idempotent, because completion has two triggers.**
   * The other is the buyer posting a review, which is event-driven and needs no
   * timer. Whichever happens first completes the order. A ledger entry keyed on
   * the order is what stops a review on day 3 and this sweep on day 7 awarding
   * twice — `pointsLedger` is append-only, so an un-keyed second append would
   * be a permanent double-credit with no way to net it off.
   *
   * 🛑 **`act`, but the points award is NOT built yet** — Phase P is step 16.
   * Firing this today closes the dispute window and records the completion;
   * the ledger write is added when Phase P lands, and the sweep's own narrowing
   * (see `performAction`) keeps anything monetary escalating until then.
   *
   * 🛑 **One open question I am NOT guessing at**, recorded in the plan: the
   * requirement says *"if no review no points"* AND *"they are also assigned if
   * the user [raises] no issues… after 7 days"*. Those two cannot both hold —
   * the second awards points to a buyer who never reviewed. Implemented as
   * "review OR 7-day silence", which is what *"they are ALSO assigned"* says,
   * and flagged for confirmation.
   */
  "order-complete": {
    anchor: (o) => o.deliveryDate,
    duration: { value: 7, unit: "days", calendar: "calendar" },
    warnAt: [{ value: 2, unit: "days", calendar: "calendar" }],
    /*
     * Refuses to fire while ANY issue is live: a return in any state, a refund
     * already posted, or a buyer-raised dispute. That is what makes the cutoff
     * safe — it can only close a window that nothing is currently using.
     */
    precondition: (o) =>
      Boolean(o.deliveryDate) &&
      /*
       * 🛑 `!o.completedAt` — the BUYER may have completed it already.
       *
       * The owner's fast path (`markOrderCompleteAction`: rate an item, mark
       * complete, immediate disburse) sets `completedAt` and closes this
       * obligation as `met`. Without this clause the sweep would still consider
       * the order due at day 7 and fire a second completion — re-closing a
       * closed window and, once Phase P lands, awarding points a second time
       * against an append-only ledger.
       *
       * Belt and braces with the obligation already being closed, deliberately:
       * the row is an index and the order is the truth, so the truth gets a say.
       */
      !o.completedAt &&
      notTerminal(o) &&
      o.status !== "return_requested" &&
      o.status !== "returned" &&
      !o.returnRequestedAt &&
      !o.disputeRaised &&
      (o.refunds?.length ?? 0) === 0,
    onDue: "act",
    settingPath: "returns.disputeWindowDays",
    publishedCopyKey: "obligations.orderComplete",
    describe:
      "7 days passed since delivery with no issue raised — the order is complete and the dispute window has closed.",
  },

  /*
   * ── MONEY OUT ────────────────────────────────────────────────────────────
   */

  /**
   * When the seller's funds become payable.
   *
   * 🛑 `escalate`, NOT `act`, and the asymmetry is the rule: **withholding a
   * payout is always safe; releasing one never is.** This obligation's firing
   * means "the quiet period has elapsed" — it does not itself pay anybody.
   * The payout job reads the same cutoff and decides.
   *
   * `blockedBy` is the quiet-period invariant in declarative form: an order's
   * funds are payable only when every obligation that could still move money
   * OUT of it is closed.
   */
  "payout-release": {
    anchor: (o) => o.deliveryDate,
    duration: { value: 7, unit: "days", calendar: "business" },
    precondition: (o) => Boolean(o.deliveryDate) && notTerminal(o),
    /*
     * 🛑 `order-complete` is in this list, and it is the one that makes the
     * quiet period mean what it says. The others close individual windows; the
     * dispute cutoff is the fact that NO NEW claim can arrive. Releasing a
     * payout before it has fired means paying a seller while a buyer can still
     * raise a dispute against that order — which is how a chargeback lands
     * after the money has left.
     */
    blockedBy: [
      "return-respond",
      "return-post",
      "return-receive",
      "return-inspect",
      "claim-shipping",
      "claim-sale",
      "order-complete",
    ],
    onDue: "escalate",
    settingPath: "commissions.payoutHoldDays",
    publishedCopyKey: "obligations.payoutRelease",
    describe: "The payout quiet period has elapsed for this order.",
  },
};

/**
 * Minutes a duration represents, for the non-business case.
 *
 * Exported so the sweep and `deadlinesFor` share one conversion rather than
 * two — and `PAYMENT_WINDOW_MINUTES` is imported here purely so the one
 * pre-existing minute-scale window in the system is expressible in the same
 * vocabulary if it is ever folded in.
 */
export function durationToMinutes(d: Duration): number {
  switch (d.unit) {
    case "minutes":
      return d.value;
    case "hours":
      return d.value * 60;
    case "days":
      return d.value * 24 * 60;
  }
}

/** The payment window, in this registry's vocabulary. Not yet an obligation kind. */
export const PAYMENT_WINDOW_AS_DURATION: Duration = {
  value: PAYMENT_WINDOW_MINUTES,
  unit: "minutes",
  calendar: "calendar",
};
