import { orderRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { normalizeError } from "../../../../errors/normalize";
import { ORDER_MESSAGES } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

const AUTO_APPROVE_HOURS = 2;

/**
 * Buyout orders get a full day of admin review instead of two hours.
 *
 * A Buy Now purchase is settled in a one-hour scramble against a still-live
 * auction, and the amounts involved are whole-listing rather than incremental —
 * so an admin should get a proper working day to look at the proof before the
 * safety net fires, rather than a window that can elapse overnight.
 */
const BUYOUT_AUTO_APPROVE_HOURS = 24;

function autoApproveHoursFor(order: { isBuyout?: boolean }): number {
  return order.isBuyout === true ? BUYOUT_AUTO_APPROVE_HOURS : AUTO_APPROVE_HOURS;
}

/**
 * 2-hour auto-approve safety net — a manual-payment proof nobody has acted
 * on (no admin approve / re-upload-request / fraud-reject) within 2 hours of
 * submission is auto-confirmed, exactly mirroring `adminVerifyPaymentAction`'s
 * effect, plus `autoApproved`/`autoApprovedAt` so it's visibly distinguishable
 * from a manually-reviewed order. Buyer/seller can raise a dispute afterward
 * via `raiseOrderDisputeAction` — this sweep never reverses itself.
 *
 * Buyout orders are held back to 24 hours (see `BUYOUT_AUTO_APPROVE_HOURS`).
 * The QUERY still runs at the 2-hour cutoff and the longer window is applied
 * in-memory, so this keeps one query on one existing composite index rather
 * than needing a second scan on a second cutoff.
 */
export async function runPaymentReviewAutoApprove(ctx: JobContext): Promise<void> {
  ctx.logger.info(`Scanning unreviewed payment proofs > ${AUTO_APPROVE_HOURS}h old`);

  const scanned = await orderRepository.getUnreviewedProofPastDeadline(AUTO_APPROVE_HOURS);
  const unreviewed = scanned.filter((entry) => {
    const hours = autoApproveHoursFor(entry.data);
    if (hours === AUTO_APPROVE_HOURS) return true;
    const uploadedAt = entry.data.paymentProofUploadedAt
      ? new Date(entry.data.paymentProofUploadedAt as unknown as string | Date)
      : null;
    if (!uploadedAt) return false;
    return ctx.now.getTime() - uploadedAt.getTime() >= hours * 60 * 60 * 1000;
  });

  const held = scanned.length - unreviewed.length;
  if (held > 0) {
    ctx.logger.info(`Holding ${held} buyout order(s) for the ${BUYOUT_AUTO_APPROVE_HOURS}h admin window`);
  }

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
          amount: entry.data.totalPrice,
          paidAt: ctx.now,
          verifiedBy: "system:auto-approve",
          verificationMethod: "manual_review",
        },
        autoApproved: true,
        autoApprovedAt: ctx.now,
      } as never);
      approved += 1;
    } catch (err) {
      void normalizeError(err);
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
