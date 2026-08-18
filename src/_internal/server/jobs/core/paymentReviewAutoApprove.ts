import { orderRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { ORDER_MESSAGES } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

const AUTO_APPROVE_HOURS = 2;

/**
 * 2-hour auto-approve safety net — a manual-payment proof nobody has acted
 * on (no admin approve / re-upload-request / fraud-reject) within 2 hours of
 * submission is auto-confirmed, exactly mirroring `adminVerifyPaymentAction`'s
 * effect, plus `autoApproved`/`autoApprovedAt` so it's visibly distinguishable
 * from a manually-reviewed order. Buyer/seller can raise a dispute afterward
 * via `raiseOrderDisputeAction` — this sweep never reverses itself.
 */
export async function runPaymentReviewAutoApprove(ctx: JobContext): Promise<void> {
  ctx.logger.info(`Scanning unreviewed payment proofs > ${AUTO_APPROVE_HOURS}h old`);

  const unreviewed = await orderRepository.getUnreviewedProofPastDeadline(AUTO_APPROVE_HOURS);
  if (unreviewed.length === 0) {
    ctx.logger.info("No unreviewed payment proofs past the auto-approve window");
    return;
  }

  let approved = 0;
  for (const entry of unreviewed) {
    try {
      await orderRepository.update(entry.id, {
        paymentStatus: "paid",
        paymentId: entry.data.paymentTransactionId ?? entry.data.paymentId ?? `manual-${entry.id}`,
        status: "processing",
        paymentRecord: {
          method: "manual",
          transactionId: entry.data.paymentTransactionId,
          proofUrl: entry.data.paymentProofUrl,
          amountPaise: entry.data.totalPrice,
          paidAt: ctx.now,
          verifiedBy: "system:auto-approve",
          verificationMethod: "manual_review",
        },
        autoApproved: true,
        autoApprovedAt: ctx.now,
      } as never);
      approved += 1;
    } catch (err) {
      ctx.logger.error("Failed to auto-approve payment proof", err, { orderId: entry.id });
    }
  }

  await Promise.allSettled(
    unreviewed.map((entry) =>
      sendNotification({
        userId: entry.data.userId,
        type: "payment_review",
        priority: "normal",
        title: ORDER_MESSAGES.AUTO_APPROVED_TITLE,
        message: ORDER_MESSAGES.AUTO_APPROVED_MESSAGE(entry.data.productTitle),
        relatedId: entry.id,
        relatedType: "order",
      }),
    ),
  );

  ctx.logger.info("Payment review auto-approve sweep complete", {
    scanned: unreviewed.length,
    approved,
  });
}
