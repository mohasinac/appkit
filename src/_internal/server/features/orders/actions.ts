"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { adminNotificationsRepository, orderRepository, storeRepository, userRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  returnRequestSchema,
} from "../../../shared/features/orders/schema";
import { isFinalSaleExempt } from "../../../shared/features/orders/return-reasons";
import {
  DISPUTE_KIND_LABEL,
  checkDisputeGate,
  isDisputeKind,
  type DisputeKind,
} from "../../../shared/features/orders/dispute-reasons";
import { disputeReasonsRepository } from "../../../../features/dispute-reasons/repository/dispute-reasons.repository";
import { REFUND_COPY } from "../../../shared/features/orders/refund-copy";
import { assertOrderCancellable, assertReturnWindowOpen } from "./service";
import { cancelOrderWithRefund } from "./cancellation-refund";
import { ValidationError } from "../../../shared/errors/index";
import { OrderNotFoundError, OrderOwnershipError } from "../../../shared/features/orders/errors";
import { isAdminUser, isModeratorUser } from "../../../../features/auth/role-predicates";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { restoreStockForOrder } from "../checkout/stock-restore";
import { getAdminDb } from "../../../../providers/db-firebase";
import { enqueueJob } from "../../../../features/jobs/actions/enqueue-job";
import { PAYMENT_WINDOW_MS, PAYMENT_FRAUD_REJECTED_REASON, isManualPaymentMethod } from "../../../../features/orders/constants/payment-window";
/*
 * The dispute cutoff is DERIVED from the `order-complete` policy, never read
 * off a stored flag — one definition of "7 days after delivery", shared with
 * the sweep that closes the window and with whatever page tells the buyer when
 * it closes.
 */
import { deadlinesFor } from "../../../shared/obligations/deadlines";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";

export async function createOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = createOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid order input");
      return orderRepository.createOrder({
        ...(parsed.data as any),
        userId: user.uid,
        status: "pending",
      } as any);
  });
}

/**
 * Cancel an order, and give the money back if any was taken (D14).
 *
 * 🛑 `assertOrderCancellable` already RETURNS the order it validated, and this
 * threw that away and let `cancelOrder` fetch it again. Reusing it saves a read
 * on every cancellation and — more importantly — means the refund is decided
 * against the same document the ownership and dispatch checks ran on, rather
 * than against a re-read that could have moved in between.
 *
 * The response shape widened from the bare order to `{ order, refund }`. The
 * order alone could not express the thing a buyer most needs to know, which is
 * whether their money is coming back automatically or waiting on a human.
 */
export async function cancelOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = cancelOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const order = await assertOrderCancellable(parsed.data.orderId, user.uid);
      return cancelOrderWithRefund(order, {
        reason: parsed.data.reason ?? "Cancelled by user",
        actorUid: user.uid,
        actorRole: "buyer",
        trigger: "cancelOrderAction",
      });
  });
}

/**
 * Buyer requests a return on a delivered order.
 *
 * Two things this did not do before, both of which made the feature unusable:
 *
 *  1. it parsed `cancelOrderSchema` and then **discarded the reason**, so an
 *     order reached `return_requested` with nothing recorded about why;
 *  2. it had no caller anywhere — the whole path was unreachable.
 */
export async function requestReturnAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = returnRequestSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const { orderId, reasonCode, reasonNote, itemIds } = parsed.data;

      // Ownership + the 7-day post-delivery window.
      await assertReturnWindowOpen(orderId, user.uid);

      /*
       * The final-sale gate, in the same shape as `processRefundAction`'s.
       * Both entry points need it: this one is where the buyer asks, that one
       * is where the money moves, and a buyer must not be able to lodge a
       * request that is guaranteed to be refused at the second gate.
       *
       * Read from the order's per-line snapshot, never the live product.
       */
      if (!isFinalSaleExempt(reasonCode)) {
        const order = await orderRepository.findById(orderId);
        if (!order) throw new OrderNotFoundError(orderId);
        const scopedItems = itemIds?.length
          ? (order.items ?? []).filter((i) => itemIds.includes(i.productId))
          : (order.items ?? []);
        if (scopedItems.some((i) => i.finalSale === true)) {
          throw new ValidationError(REFUND_COPY.request.finalSaleBlockedMessage);
        }
      }

      /*
       * Record the reason BEFORE flipping the status. A status change is what
       * every notification and dashboard query keys on, so a seller reading
       * the row the moment it lands must already find the reason on it.
       */
      await orderRepository.update(orderId, {
        returnReasonCode: reasonCode,
        ...(reasonNote ? { returnReasonNote: reasonNote } : {}),
        returnRequestedAt: new Date(),
        ...(itemIds?.length ? { returnRequestedItemIds: itemIds } : {}),
      } as any);

      return orderRepository.updateStatus(orderId, "return_requested" as any);
  });
}

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = updateOrderStatusSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const order = await orderRepository.findById(parsed.data.orderId);
      if (!order) throw new OrderNotFoundError(parsed.data.orderId);
      if (!isAdminUser(user) && order.storeId !== user.uid) {
        throw new OrderOwnershipError(parsed.data.orderId);
      }
      return orderRepository.updateStatus(parsed.data.orderId, parsed.data.status as any, {
        trackingNumber: parsed.data.trackingNumber,
        shippingCarrier: parsed.data.carrier,
      } as any);
  });
}

// ── P-1 Manual payment proof ─────────────────────────────────────────────────

/** Loose UPI VPA comparison — case/whitespace differences shouldn't register as a mismatch. */
function normalizeUpi(vpa: string | undefined): string {
  return (vpa ?? "").trim().toLowerCase();
}

const REASON_REQUIRED_MSG = "A reason is required";

/**
 * Fast-review signal — a payment proof needs acting on inside the 2-hour
 * auto-approve window, and the admin should not have to hunt the orders list
 * to find it.
 *
 * 🛑 This used to `Promise.allSettled` a WhatsApp message to EVERY number in
 * `whatsappAdminNotifyNumbers`, on every proof upload. Three problems, in
 * increasing order of importance:
 *
 *   1. it was an unbounded fan-out on a metered channel;
 *   2. WhatsApp free-form messages are rejected by Meta outside the 24-hour
 *      customer-service window, so the alert most likely to matter — the one
 *      arriving after a quiet period — is precisely the one that would fail;
 *   3. it left no record. A missed push was simply gone, whereas the queue at
 *      `/admin/orders` is the thing an admin actually works from.
 *
 * One `adminNotifications` row instead: durable, deduplicated by nature, read
 * by the admin inbox, and counted in the daily digest. Still fire-and-forget
 * and still non-fatal — the buyer's upload already succeeded, and a failure to
 * announce it must never surface as an upload error.
 */
function notifyAdminsOfPaymentProof(order: { id: string; userName: string; productTitle: string; totalPrice: number }): void {
  void (async () => {
    try {
      const { adminNotificationsRepository } = await import("../../../../repositories");
      await adminNotificationsRepository.create({
        category: "payouts",
        title: "Payment proof awaiting review",
        body: `${order.userName} uploaded proof for "${order.productTitle}" (₹${order.totalPrice.toLocaleString("en-IN")}). Review before the 2-hour auto-approve window closes.`,
        severity: "warning",
        isRead: false,
        entityType: "order",
        entityId: order.id,
        audienceUserIds: [],
      });
    } catch (err) {
      void normalizeError(err);
      serverLogger.warn("Payment-proof admin notification failed (non-fatal)", {
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}

export async function attachPaymentProofAction(
  orderId: string,
  proof: {
    proofUrl: string;
    transactionId?: string;
    mimeType?: string;
    buyerMarkedPaid: boolean;
    buyerFraudAgreementAccepted: boolean;
    buyerReportedUpiId?: string;
  },
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (!isAdminUser(user) && order.userId !== user.uid) throw new OrderOwnershipError(orderId);
    // Use the shared predicate rather than re-inlining the method list — this
    // was the second of the two sites that had drifted from it (the other being
    // AdminOrderEditorView, which was missing `emi` outright).
    if (!isManualPaymentMethod(order.paymentMethod ?? "")) {
      throw new ValidationError("Payment proof can only be attached to cash, UPI, or EMI orders");
    }
    if (order.paymentProofUrl) {
      throw new ValidationError("PROOF_ALREADY_ATTACHED");
    }
    // The 15-min sweep cancels+restocks the order once its window passes with
    // no proof attached — a late submission must surface a clear "window
    // expired" error rather than silently attaching proof to a dead order.
    if (order.paymentDeadline && new Date(order.paymentDeadline) < new Date() && order.status !== "pending") {
      throw new ValidationError("PAYMENT_WINDOW_EXPIRED");
    }
    if (!proof.buyerFraudAgreementAccepted) {
      throw new ValidationError(
        "You must confirm this payment is genuine before submitting proof.",
      );
    }
    const paymentUpiMismatch = order.displayedUpiId
      ? normalizeUpi(proof.buyerReportedUpiId) !== normalizeUpi(order.displayedUpiId)
      : false;
    await orderRepository.update(orderId, {
      paymentProofUrl: proof.proofUrl,
      paymentTransactionId: proof.transactionId,
      paymentProofMimeType: proof.mimeType,
      paymentProofUploadedAt: new Date(),
      buyerMarkedPaid: proof.buyerMarkedPaid,
      buyerMarkedPaidAt: proof.buyerMarkedPaid ? new Date() : undefined,
      buyerFraudAgreementAccepted: proof.buyerFraudAgreementAccepted,
      buyerFraudAgreementAcceptedAt: new Date(),
      buyerReportedUpiId: proof.buyerReportedUpiId,
      paymentUpiMismatch,
      // A re-upload after `adminRequestProofReuploadAction` must clear the
      // stale `reupload_requested` outcome. Both the 2-hour auto-approve
      // sweep (`getUnreviewedProofPastDeadline`) and the admin
      // "Awaiting verification" queue treat *any* set outcome as "already
      // decided" — leaving it set meant a corrected proof was invisible to
      // both: never auto-approved, never surfaced for manual review.
      paymentReviewOutcome: null,
      paymentReviewedBy: null,
      paymentReviewedAt: null,
    } as any);

    notifyAdminsOfPaymentProof({
      id: orderId,
      /*
       * Revealed: this names the buyer to an admin who is about to verify
       * their payment proof, so a mask would defeat the purpose. `order` comes
       * from a repository read, which is ciphertext-by-default.
       */
      userName: orderRepository.revealOrder(order).userName,
      productTitle: order.productTitle,
      totalPrice: order.totalPrice,
    });
  });
}

export async function adminVerifyPaymentAction(orderId: string): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);
    if (!isAdminUser(user) && !isModeratorUser(user)) {
      throw new ValidationError("Only admin or moderator can verify payments");
    }
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.paymentStatus === "paid") return; // idempotent
    await orderRepository.update(orderId, {
      paymentStatus: "paid",
      paymentId: order.paymentTransactionId ?? order.paymentId ?? `manual-${orderId}`,
      status: "processing",
      paymentRecord: {
        method: "manual",
        transactionId: order.paymentTransactionId,
        proofUrl: order.paymentProofUrl,
        amount: order.totalPrice,
        paidAt: new Date(),
        verifiedBy: user.uid,
        verificationMethod: "manual_review",
      },
      paymentReviewOutcome: "approved",
      paymentReviewedBy: user.uid,
      paymentReviewedAt: new Date(),
    } as any);
  });
}

/**
 * Tier PP — "honest mistake" tier of the two-tier admin review (blurry
 * screenshot, wrong amount typed). Clears the proof so the buyer can cleanly
 * resubmit, and extends `paymentDeadline` by another 15 minutes from now so
 * review latency doesn't eat into the buyer's time to fix it. Order stays
 * `pending`/`pending` — no penalty.
 */
export async function adminRequestProofReuploadAction(
  orderId: string,
  note: string,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);
    if (!isAdminUser(user) && !isModeratorUser(user)) {
      throw new ValidationError("Only admin or moderator can request a proof re-upload");
    }
    if (!note.trim()) throw new ValidationError(REASON_REQUIRED_MSG);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.paymentStatus === "paid") {
      throw new ValidationError("This order's payment is already verified");
    }
    await orderRepository.update(orderId, {
      paymentProofUrl: null,
      paymentTransactionId: null,
      paymentProofMimeType: null,
      paymentProofUploadedAt: null,
      buyerMarkedPaid: null,
      buyerMarkedPaidAt: null,
      buyerFraudAgreementAccepted: null,
      buyerFraudAgreementAcceptedAt: null,
      buyerReportedUpiId: null,
      paymentUpiMismatch: null,
      paymentDeadline: new Date(Date.now() + PAYMENT_WINDOW_MS),
      paymentReviewOutcome: "reupload_requested",
      paymentReviewNote: note,
      paymentReviewedBy: user.uid,
      paymentReviewedAt: new Date(),
    } as any);
    await sendNotification({
      userId: order.userId,
      type: "payment_review",
      priority: "high",
      title: "Payment proof needs correction",
      message: `Your payment proof for "${order.productTitle}" needs correction: ${note}. Please re-upload within 15 minutes.`,
      relatedId: orderId,
      relatedType: "order",
    });
  });
}

/**
 * Tier PP — "fraud" tier of the two-tier admin review. Cancels the order,
 * restores stock, and triggers a new temporary 7-day full-account hard ban
 * (extends the existing permanent-only `hardBanCascade` job with an
 * `expiresAt`, rather than forking a parallel cascade — see
 * `HardBanCascadeInput.expiresAt`).
 */
export async function adminRejectPaymentAsFraudAction(
  orderId: string,
  note: string,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);
    if (!isAdminUser(user) && !isModeratorUser(user)) {
      throw new ValidationError("Only admin or moderator can reject a payment as fraudulent");
    }
    if (!note.trim()) throw new ValidationError(REASON_REQUIRED_MSG);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.paymentStatus === "paid") {
      throw new ValidationError("This order's payment is already verified");
    }

    await restoreStockForOrder(getAdminDb(), { ...order, id: orderId }, {
      status: "cancelled",
      cancellationDate: new Date(),
      cancellationReason: PAYMENT_FRAUD_REJECTED_REASON,
      paymentReviewOutcome: "rejected_fraud",
      paymentReviewNote: note,
      paymentReviewedBy: user.uid,
      paymentReviewedAt: new Date(),
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await enqueueJob({
      jobType: "hardBanCascade",
      payload: {
        uid: order.userId,
        reason: `Fraudulent payment proof on order ${orderId}: ${note}`,
        bannedBy: user.uid,
        expiresAt: expiresAt.toISOString(),
        fraudOrderId: orderId,
      },
      requestedBy: user.uid,
    });
  });
}

/**
 * Tier PP — raises a dispute on an auto-approved order ("the automation
 * might be wrong"). Only valid when `autoApproved === true` — a manually
 * reviewed order already went through human judgment and disputes on it go
 * through the existing return/refund flow instead. Callable by the buyer,
 * the seller (store owner), or admin/moderator. Does not itself reverse
 * payment/order status — surfaces to the admin queue for investigation.
 */
export async function raiseOrderDisputeAction(
  orderId: string,
  input: {
    kind: DisputeKind;
    /** `disputeReasons/{id}` — must exist and must match `kind`. */
    reasonId: string;
    /** The buyer's own words. Optional; the reason is the required part. */
    detail?: string;
  },
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    if (!isDisputeKind(input.kind)) throw new ValidationError("Pick what kind of problem this is.");
    if (!input.reasonId?.trim()) throw new ValidationError(REASON_REQUIRED_MSG);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);

    const isBuyer = order.userId === user.uid;
    let isSeller = false;
    if (!isBuyer && !isAdminUser(user) && !isModeratorUser(user) && order.storeId) {
      const store = await storeRepository.findById(order.storeId);
      isSeller = store?.ownerId === user.uid;
    }
    if (!isBuyer && !isSeller && !isAdminUser(user) && !isModeratorUser(user)) {
      throw new OrderOwnershipError(orderId);
    }
    /*
     * 🛑 THE `autoApproved` RESTRICTION IS GONE, and that is the one
     * behaviour change an existing path will notice.
     *
     * It used to refuse every order whose payment was not auto-approved,
     * telling the caller to use the return/refund flow — which made this a
     * narrow "the 2-hour auto-approval might have been wrong" escalation
     * rather than a dispute mechanism. The owner's rules are about delivery
     * and item problems on ANY order, so the scope had to widen.
     *
     * What replaces it is a REAL gate per kind, below: the old check refused
     * 99% of orders for a reason unrelated to the complaint, while accepting
     * "it never arrived" on an order delivered last week.
     */
    if (order.disputeStatus === "open") return; // idempotent

    /*
     * The reason must exist AND belong to the kind being claimed.
     *
     * 🛑 Both halves matter. Without the kind check a caller could pass an
     * `item` reason with `kind: "not_reached"` and pass the wrong gate — the
     * kind is what the gate keys on, so an unvalidated pairing is the gate
     * being bypassed by the request body.
     */
    const reasonDoc = await disputeReasonsRepository.findById(input.reasonId.trim());
    if (!reasonDoc || !reasonDoc.isActive) {
      throw new ValidationError("That reason is no longer available. Pick another.");
    }
    if (reasonDoc.kind !== input.kind) {
      throw new ValidationError("That reason doesn't match the kind of problem selected.");
    }

    /*
     * ── THE GATES ─────────────────────────────────────────────────────────
     *
     * Owner's rules: an item dispute only after the order was received; a
     * "not reached" dispute only once the ETD is more than 3 days past.
     *
     * Enforced HERE, where the request arrives, for the same reason the
     * 7-day cutoff below is: a refusal has to live where the refusing
     * happens. The message is buyer-facing and names the next action.
     */
    const gate = checkDisputeGate(input.kind, order);
    if (!gate.allowed) throw new ValidationError(gate.message);

    /*
     * ── THE DISPUTE CUTOFF ────────────────────────────────────────────────
     *
     * Owner's rule, 2026-10-21: *"after 7 days of delivery no further disputes
     * should be entertained."*
     *
     * 🛑 Enforced here, at the one place a dispute is RAISED, rather than in
     * the sweep — because a cutoff is a refusal, and a refusal has to live
     * where the request arrives. The `order-complete` obligation firing records
     * that the window shut; this is what makes the record mean something.
     *
     * 🛑 It closes the door to NEW disputes ONLY. An existing dispute, an
     * in-flight return, or a refund already posted are all untouched — the
     * `order-complete` precondition refuses to fire while any of those is live,
     * so by construction this cutoff can only exist on an order where nothing
     * was ever contested. Reading the rule as "everything closes at 7 days"
     * would cancel a return the buyer raised on day 6, which is the opposite of
     * what a dispute window is for.
     *
     * Derived from `deliveryDate` rather than read off a stored flag, for the
     * same reason every other deadline here is derived: a stored
     * `disputeWindowClosed` boolean would need a backfill and would drift from
     * the policy the day the duration changed (Root Cause #42).
     */
    /*
     * 🛑 This correctly does NOT apply to a `not_reached` dispute, and that is
     * not an oversight to "fix".
     *
     * `order-complete` is anchored on `deliveryDate`, so `deadlinesFor` yields
     * no such deadline when nothing was delivered — and you cannot be past a
     * delivery window that never happened. Making the cutoff refuse
     * undelivered parcels would block exactly the buyers whose parcel is lost,
     * which is the opposite of what a dispute window is for.
     */
    const completion = deadlinesFor(order).find((d) => d.kind === "order-complete");
    if (completion && completion.dueAt.getTime() <= Date.now()) {
      throw new ValidationError(
        `The dispute window for this order closed on ${completion.dueAt.toLocaleDateString("en-IN")} — 7 days after delivery. Contact support if you believe this is wrong.`,
      );
    }

    /*
     * No `as any`. Every field below is declared on `OrderDocument`, and the
     * cast that used to be here is precisely how a misspelled field reaches
     * Firestore unnoticed — it silences the check on all six at once.
     *
     * 🛑 `disputeReason` stores the reason's LABEL, not its id. It is a
     * SNAPSHOT: staff can retire or reword a `disputeReasons` row, and neither
     * may rewrite what a buyer said months ago. `disputeReasonId` beside it is
     * the join key for "what are buyers reporting"; the label is the record.
     * Same discipline as the fee terms and the box presets.
     */
    await orderRepository.update(orderId, {
      disputeRaised: true,
      disputeRaisedBy: user.uid,
      disputeRaisedAt: new Date(),
      disputeKind: input.kind,
      disputeReasonId: reasonDoc.id,
      disputeReason: reasonDoc.label,
      ...(input.detail?.trim() ? { disputeDetail: input.detail.trim() } : {}),
      disputeStatus: "open",
    });

    /*
     * One admin-inbox row, not one notification per admin.
     *
     * 🛑 This was `Promise.allSettled` over `userRepository.findByRole("admin")`
     * sending `payment_review` — an email-ELIGIBLE type — so a single disputed
     * order cost one email per admin, concurrently. Same defect as the
     * scam-report employee blast (removed in the same change), and the comment
     * on that one said it was copying this pattern.
     *
     * `adminNotifications` is durable, appears in the admin inbox, is counted
     * in the daily digest, and costs exactly one write regardless of how many
     * admins exist.
     */
    await adminNotificationsRepository
      .create({
        category: "fraud",
        /*
         * 🛑 No longer "on auto-approved order". The title said that because
         * the action refused everything else; now any order can be disputed,
         * and a title naming a payment path the dispute has nothing to do with
         * would send an operator looking in the wrong place.
         */
        title: `Dispute raised: ${DISPUTE_KIND_LABEL[input.kind]}`,
        body: `A dispute was raised on order "${order.productTitle}". Reason: ${reasonDoc.label}.${
          input.detail?.trim() ? ` Buyer said: "${input.detail.trim()}"` : ""
        }`,
        severity: "error",
        isRead: false,
        entityType: "order",
        entityId: orderId,
        audienceUserIds: [],
      })
      .catch((err: unknown) => {
        void normalizeError(err);
        serverLogger.error("Failed to write dispute admin notification (non-fatal)", { orderId });
      });
  });
}

/**
 * A buyer submits payment for ONE of their own EMI instalments.
 *
 * 🛑 Why this exists at all: there was no buyer-side route. The only writer
 * was the seller's `markEmiInstallmentPaid`, so a buyer on an EMI plan could
 * not pay an instalment — they waited for the seller to record it. The
 * schema had anticipated them all along (`EmiInstallment.transactionId` and
 * `.proofUrl` are documented as "buyer-uploaded"), which is the tell that the
 * surface, not the model, was missing.
 *
 * 🛑 **ANY unpaid instalment, at ANY time — deliberately unbounded.** There is
 * no due-date check and none should be added. A buyer who wants to clear the
 * plan early is reducing our exposure, not breaking a rule, and the dueDate is
 * the date we will CHASE them on, never the first date they may pay. Paying
 * ahead also keeps `emiComplete` honest: that flag is what
 * `assertEmiShippable` reads, so early settlement should be able to release a
 * shipment early rather than waiting out a calendar.
 *
 * It mirrors the manual-payment model rather than inventing a second one: the
 * buyer supplies a UTR and a proof, the seller or an admin confirms. The
 * status therefore moves to `pending` review here, NOT to `paid` — a buyer
 * must never be able to mark their own money received. `markEmiInstallmentPaid`
 * stays the only writer of `paid`, and so stays the only way `emiComplete`
 * can flip.
 */
export async function submitEmiInstallmentPaymentAction(
  orderId: string,
  input: { installmentIndex: number; transactionId: string; proofUrl?: string },
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (!isAdminUser(user) && order.userId !== user.uid) throw new OrderOwnershipError(orderId);
    if (!order.emiEnabled) throw new ValidationError("This order is not on an EMI plan");

    const installments = order.emiInstallments ?? [];
    const target = installments.find((i) => i.index === input.installmentIndex);
    if (!target) {
      throw new ValidationError(
        `Installment ${input.installmentIndex} not found on this order`,
      );
    }
    if (target.status === "paid") {
      throw new ValidationError("This installment is already paid");
    }
    // A second submission would overwrite the reference the reviewer is
    // currently looking at, which reads to them as the buyer changing their
    // story. Re-submitting needs the reviewer to reject the first one.
    if (target.transactionId) {
      throw new ValidationError("A payment reference is already under review for this installment");
    }

    /*
     * 🛑 `status` is NOT written here, and writing it would be a lie dressed
     * as a state change.
     *
     * A new instalment is created `status: "pending"` (see
     * `createOrderForGroup`), so setting `"pending"` again changes nothing
     * while reading like a transition — and it would leave "nobody has paid"
     * and "the buyer has reported paying" indistinguishable, which is exactly
     * the state a reviewer needs to tell apart.
     *
     * "Awaiting review" is DERIVED: `transactionId` set and `status !== "paid"`.
     * Same rule as the manual-payment queue, which derives its four states
     * from `paymentProofUrl` + `paymentReviewOutcome` rather than storing a
     * mirror field that any write path could forget to update (Root Cause
     * #42). Only `markEmiInstallmentPaid` writes `paid`, so a buyer can never
     * mark their own money received, and `emiComplete` keeps its single writer.
     */
    const updatedInstallments = installments.map((i) =>
      i.index === input.installmentIndex
        ? { ...i, transactionId: input.transactionId, proofUrl: input.proofUrl }
        : i,
    );

    await orderRepository.update(orderId, { emiInstallments: updatedInstallments });

    /*
     * Tell the seller there is something to confirm. Best-effort: a
     * notification that fails must not lose the buyer's submitted reference,
     * which is the only record that they paid.
     */
    const store = order.storeId ? await storeRepository.findById(order.storeId) : null;
    if (store?.ownerId) {
      await sendNotification({
        userId: store.ownerId,
        type: "payment_review",
        /*
         * `high`, matching the other `payment_review` send in this file. The
         * two differ in urgency — that one has a 15-minute re-upload window
         * and this one has no deadline — but a single notification TYPE whose
         * priority disagrees between its call sites is the drift this codebase
         * keeps paying for, and unconfirmed money is a seller action item
         * either way.
         */
        priority: "high",
        title: "EMI instalment payment reported",
        message: `A buyer has submitted payment for instalment ${input.installmentIndex} on order ${orderId}.`,
        relatedId: orderId,
        relatedType: "order",
      }).catch((err: unknown) => {
        void normalizeError(err);
        serverLogger.error("Failed to notify seller of EMI instalment payment (non-fatal)", {
          orderId,
          installmentIndex: input.installmentIndex,
        });
      });
    }
  });
}
