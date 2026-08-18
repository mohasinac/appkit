"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { orderRepository, storeRepository, userRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from "../../../shared/features/orders/schema";
import { assertOrderCancellable, assertReturnWindowOpen } from "./service";
import { ValidationError } from "../../../shared/errors/index";
import { OrderNotFoundError, OrderOwnershipError } from "../../../shared/features/orders/errors";
import { isAdminUser, isModeratorUser } from "../../../../features/auth/role-predicates";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { restoreStockForOrder } from "../checkout/stock-restore";
import { getAdminDb } from "../../../../providers/db-firebase";
import { enqueueJob } from "../../../../features/jobs/actions/enqueue-job";
import { PAYMENT_WINDOW_MS, PAYMENT_FRAUD_REJECTED_REASON } from "../../../../features/orders/constants/payment-window";

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

export async function requestReturnAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = cancelOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      await assertReturnWindowOpen(parsed.data.orderId, user.uid);
      return orderRepository.updateStatus(parsed.data.orderId, "return_requested" as any);
  });
}

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = updateOrderStatusSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const order = await orderRepository.findById(parsed.data.orderId).catch(() => null);
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

/**
 * Fast-review WhatsApp push — fans out to every configured admin number so
 * a payment proof can be acted on within the 2-hour auto-approve window
 * without hunting through the orders list. Fire-and-forget, non-fatal on
 * failure (mirrors the existing `onOrderCreate.ts` purchase-announcement
 * pattern) — skips silently if the WhatsApp Cloud API isn't configured.
 */
function notifyAdminsOfPaymentProof(order: { id: string; userName: string; productTitle: string; totalPrice: number }): void {
  void (async () => {
    try {
      const [{ resolveKeys }, { sendWhatsAppBusinessMessage, buildPaymentProofReviewMessage }] = await Promise.all([
        import("../../../../core/integration-keys"),
        import("../../../../features/whatsapp-bot/server"),
      ]);
      const keys = await resolveKeys();
      if (!keys.whatsappPhoneNumberId || !keys.whatsappCloudApiToken) return;
      const adminNumbers = keys.whatsappAdminNotifyNumbers
        .split(",")
        .map((n) => n.trim().replace(/\D/g, ""))
        .filter(Boolean);
      if (adminNumbers.length === 0) return;

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://letitrip.in";
      const message = buildPaymentProofReviewMessage({
        orderId: order.id,
        buyerName: order.userName,
        productTitle: order.productTitle,
        totalAmount: order.totalPrice,
        reviewUrl: `${baseUrl}/admin/orders`,
      });

      await Promise.allSettled(
        adminNumbers.map((toPhone) =>
          sendWhatsAppBusinessMessage({
            toPhone,
            message,
            phoneNumberId: keys.whatsappPhoneNumberId,
            accessToken: keys.whatsappCloudApiToken,
          }),
        ),
      );
    } catch {
      // Non-fatal — the order itself already saved successfully.
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
    const order = await orderRepository.findById(orderId).catch(() => null);
    if (!order) throw new OrderNotFoundError(orderId);
    if (!isAdminUser(user) && order.userId !== user.uid) throw new OrderOwnershipError(orderId);
    const pm = order.paymentMethod ?? "";
    if (pm !== "cash" && pm !== "upi_manual" && pm !== "emi") {
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
    const order = await orderRepository.findById(orderId).catch(() => null);
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
    if (!note.trim()) throw new ValidationError("A reason is required");
    const order = await orderRepository.findById(orderId).catch(() => null);
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
    if (!note.trim()) throw new ValidationError("A reason is required");
    const order = await orderRepository.findById(orderId).catch(() => null);
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
    if (!reason.trim()) throw new ValidationError("A reason is required");
    const order = await orderRepository.findById(orderId).catch(() => null);
    if (!order) throw new OrderNotFoundError(orderId);

    const isBuyer = order.userId === user.uid;
    let isSeller = false;
    if (!isBuyer && !isAdminUser(user) && !isModeratorUser(user) && order.storeId) {
      const store = await storeRepository.findById(order.storeId).catch(() => null);
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

    // Notify every admin for manual investigation — a dispute on an
    // auto-approved order means nobody has looked at it yet.
    const admins = await userRepository.findByRole("admin");
    await Promise.allSettled(
      admins.map((admin) =>
        sendNotification({
          userId: admin.uid,
          type: "payment_review",
          priority: "high",
          title: "Dispute raised on auto-approved order",
          message: `A dispute was raised on order "${order.productTitle}" (auto-approved payment). Reason: ${reason}.`,
          relatedId: orderId,
          relatedType: "order",
        }),
      ),
    );
  });
}
