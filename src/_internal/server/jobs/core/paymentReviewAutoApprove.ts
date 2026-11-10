import { orderRepository } from "../../../../repositories";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { normalizeError } from "../../../../errors/normalize";
import { safeRead } from "../../../../errors/safe-read";
import { ORDER_MESSAGES } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

/**
 * 🛑 THIS SWEEP IS NOW OFF BY DEFAULT, AND THAT IS THE FIX.
 *
 * It used to be `const AUTO_APPROVE_HOURS = 2` — a hardcoded constant that made
 * the UNSAFE state the default. Nothing in the manual-payment flow verifies
 * anything: the buyer uploads a screenshot (forgeable in a minute) and types a
 * UTR (an invented string), and no check compares either against a bank or a
 * gateway. This sweep then turned that unreviewed claim into a PAID order —
 * and therefore into dispatched goods — two hours later, stamped
 * `verifiedBy: "system:auto-approve"`, with no human ever looking.
 *
 * That is an unattended path from a forged screenshot to lost stock. The same
 * mistake, in the same shape, is already recorded on the payment webhook,
 * where the signature bypass was keyed on `NODE_ENV` so the permissive state
 * was the default. A security-relevant automation must be opted INTO.
 *
 * It is config rather than a deletion because the safety net is legitimate for
 * an install whose payments are actually verified — a gateway or a bank-feed
 * rail. The machinery stays; the choice moves to the operator. `0` or unset
 * disables it.
 */
const AUTO_APPROVE_DISABLED = 0;

/** The query cutoff. Only used when the sweep is enabled at all. */
function resolveWindows(settings: {
  payment?: { paymentProofAutoApproveHours?: number; paymentProofAutoApproveBuyoutHours?: number };
} | null): { standard: number; buyout: number } {
  const standard = settings?.payment?.paymentProofAutoApproveHours ?? AUTO_APPROVE_DISABLED;
  /*
   * Falls back to the standard window rather than to a constant: an operator
   * who enables the sweep must not silently get a SHORTER window on buyout
   * orders, which are the largest ones on the site.
   */
  const buyout = settings?.payment?.paymentProofAutoApproveBuyoutHours ?? standard;
  return { standard, buyout };
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
  /*
   * 🛑 Read the setting BEFORE the query, and return without touching anything
   * when it is off. Scanning first and filtering later would still cost a
   * Firestore read per sweep on every install that wants this disabled — and,
   * worse, would leave the dangerous branch one edit away from running.
   */
  const settings = await safeRead(() => siteSettingsRepository.getSingleton(), {
    route: "jobs/paymentReviewAutoApprove",
    key: "paymentReviewAutoApprove.settings",
    fallback: null,
  });
  const { standard: AUTO_APPROVE_HOURS, buyout: BUYOUT_AUTO_APPROVE_HOURS } = resolveWindows(settings);

  if (AUTO_APPROVE_HOURS <= AUTO_APPROVE_DISABLED) {
    /*
     * ⚠ `info`, not `warn`. Disabled is the correct and default state, so this
     * must not look like a fault — it is the sweep reporting that a human
     * reviews every proof, which is what we want while manual payments are
     * unverified.
     */
    ctx.logger.info(
      "Payment-proof auto-approve is DISABLED (payment.paymentProofAutoApproveHours unset or 0) — every proof needs a human",
    );
    return;
  }

  ctx.logger.warn(
    `Payment-proof auto-approve is ENABLED at ${AUTO_APPROVE_HOURS}h — unreviewed proofs will be marked PAID without a human`,
  );

  const scanned = await orderRepository.getUnreviewedProofPastDeadline(AUTO_APPROVE_HOURS);
  const unreviewed = scanned.filter((entry) => {
    const hours = entry.data.isBuyout === true ? BUYOUT_AUTO_APPROVE_HOURS : AUTO_APPROVE_HOURS;
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

  // Sequential: `payment_review` is email-eligible, so each send reserves a
  // unit from the single-document daily budget counter. See pendingOrderTimeout.
  for (const entry of unreviewed) {
    try {
      await sendNotification({
        userId: entry.data.userId,
        type: "payment_review",
        priority: "normal",
        title: ORDER_MESSAGES.AUTO_APPROVED_TITLE,
        message: ORDER_MESSAGES.AUTO_APPROVED_MESSAGE(entry.data.productTitle),
        relatedId: entry.id,
        relatedType: "order",
      });
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Failed to notify buyer of auto-approved payment (non-fatal)", err, {
        orderId: entry.id,
      });
    }
  }

  ctx.logger.info("Payment review auto-approve sweep complete", {
    scanned: unreviewed.length,
    approved,
  });
}
