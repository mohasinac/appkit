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
import { REFUND_COPY } from "../../../shared/features/orders/refund-copy";
import { assertOrderCancellable, assertReturnWindowOpen } from "./service";
import { ValidationError } from "../../../shared/errors/index";
import { OrderNotFoundError, OrderOwnershipError } from "../../../shared/features/orders/errors";
import { isAdminUser, isModeratorUser } from "../../../../features/auth/role-predicates";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { restoreStockForOrder } from "../checkout/stock-restore";
import { getAdminDb } from "../../../../providers/db-firebase";
import { enqueueJob } from "../../../../features/jobs/actions/enqueue-job";
import { PAYMENT_WINDOW_MS, PAYMENT_FRAUD_REJECTED_REASON, isManualPaymentMethod } from "../../../../features/orders/constants/payment-window";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";

export async function createOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = createOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid order input");
      return orderRepository.create({
        ...(parsed.data as any),
        userId: user.uid,
        status: "pending",
      } as any);
  });
}

export async function cancelOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = cancelOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      await assertOrderCancellable(parsed.data.orderId, user.uid);
      return orderRepository.cancelOrder(parsed.data.orderId, parsed.data.reason ?? "Cancelled by user");
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
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
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
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
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
      userName: order.userName,
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
  reason: string,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
    if (!reason.trim()) throw new ValidationError(REASON_REQUIRED_MSG);
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
    if (!order.autoApproved) {
      throw new ValidationError(
        "Disputes can only be raised on auto-approved orders. Use the return/refund flow for manually-reviewed orders.",
      );
    }
    if (order.disputeStatus === "open") return; // idempotent

    await orderRepository.update(orderId, {
      disputeRaised: true,
      disputeRaisedBy: user.uid,
      disputeRaisedAt: new Date(),
      disputeReason: reason,
      disputeStatus: "open",
    } as any);

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
        title: "Dispute raised on auto-approved order",
        body: `A dispute was raised on order "${order.productTitle}" (auto-approved payment). Reason: ${reason}.`,
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
