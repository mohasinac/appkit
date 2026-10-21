/**
 * Refund Domain Actions (appkit)
 *
 * Pure business functions for admin-initiated partial refunds and
 * user-facing refund previews.  Auth, rate-limiting, and Next.js specifics
 * are handled by the consumer.
 */

import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { orderRepository } from "../../orders/repository/orders.repository";
import { RefundStatusValues } from "../../orders/schemas";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
/*
 * One owner for "how much of the platform fee is withheld". Shared with the
 * cumulative refund cap, so the figure SHOWN to the buyer and the money
 * actually withheld cannot diverge — they did: this file showed a net figure
 * while `cancelOrder` moved no money at all (D14).
 */
import {
  platformFeeWithheld,
  refundCapacity,
} from "../../../_internal/shared/checkout/refundable-base";
import { sendNotification } from "../../admin/actions/notification-actions";

const DEFAULT_GST_PERCENT = 18;

export interface PartialRefundResult {
  orderId: string;
  grossRefund: number;
  feeDeducted: number;
  netRefund: number;
  currency: string;
}

export async function issuePartialRefund(
  adminUid: string,
  orderId: string,
  deductFees: boolean,
  refundNote?: string,
): Promise<PartialRefundResult> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order not found.");
  if (order.paymentStatus !== "paid")
    throw new ValidationError("Only paid orders can be refunded.");
  if (order.refundStatus === RefundStatusValues.COMPLETED)
    throw new ValidationError("Order has already been fully refunded.");

  const settings = await siteSettingsRepository.getSingleton();
  const gstPercent = settings.commissions?.gstPercent ?? DEFAULT_GST_PERCENT;

  /*
   * ── D32: THE SINGLE WORST MONEY DEFECT IN THE AUDIT ─────────────────────
   *
   * This computed a PERCENTAGE OF THE REFUND:
   *
   *     const effectiveRate = platformFeePercent * (1 + gstPercent / 100);
   *     const feeDeducted   = (grossRefund * effectiveRate) / 100;
   *
   * which ignores `commissions.platformFeeMax` (default **₹10**) entirely, and
   * ignores `order.platformFee` — the amount that was ACTUALLY COLLECTED and
   * is stored on the order.
   *
   * Measured on a ₹5,000 order at 2% + 18% GST: it deducted **₹118** from a
   * buyer who had paid **₹11.80**, keeping ~₹106.20 of their GOODS money and
   * labelling it a platform fee. The error grows with order value, so it was
   * largest exactly where a buyer would notice.
   *
   * 🛑 `platformFeeWithheld` returns the fee as CHARGED, never a recomputed
   * rate, and it is shared with the cumulative refund cap — so the figure
   * SHOWN to the buyer here and the money actually withheld now come from one
   * place. They did not before: this function showed a net figure while
   * `cancelOrder` moved no money at all (D14).
   *
   * `gstPercent` is passed only as the LEGACY fallback, for orders written
   * before `platformFeeGst` was persisted (2026-10-21). An order that carries
   * the field ignores it entirely — which is the point, since reading today's
   * rate for a historical order is the mistake this replaces.
   */
  const grossRefund = order.totalPrice;
  const feeDeducted = deductFees ? platformFeeWithheld(order, gstPercent) : 0;
  const netRefund = parseFloat((grossRefund - feeDeducted).toFixed(2));

  await orderRepository.update(orderId, {
    refundStatus: "processing",
    refundAmount: grossRefund,
    refundFeeDeducted: feeDeducted,
    refundNetAmount: netRefund,
    refundNote,
    paymentStatus: "refunded",
    updatedAt: new Date(),
  });

  await sendNotification({
    userId: order.userId,
    type: "refund_initiated",
    priority: "high",
    title: "Refund Initiated",
    message: deductFees
      ? `Your refund of ₹${netRefund} (original ₹${grossRefund} minus ₹${feeDeducted} gateway fee) is being processed.`
      : `Your full refund of ₹${grossRefund} is being processed.`,
    relatedId: orderId,
    relatedType: "order",
  });

  serverLogger.info("Admin partial refund initiated", {
    adminUid,
    orderId,
    grossRefund,
    feeDeducted,
    netRefund,
    deductFees,
  });

  return {
    orderId,
    grossRefund,
    feeDeducted,
    netRefund,
    currency: order.currency,
  };
}

export async function previewCancellationRefund(
  userId: string,
  orderId: string,
): Promise<PartialRefundResult | null> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order not found.");
  if (order.userId !== userId) throw new AuthorizationError("Not authorised.");
  if (order.paymentStatus !== "paid") return null;

  const settings = await siteSettingsRepository.getSingleton();
  const gstPercent = settings.commissions?.gstPercent ?? DEFAULT_GST_PERCENT;

  /*
   * 🛑 A SECOND COPY of D32 lived here, and the plan only named one.
   *
   * Identical arithmetic to the function above — `platformFeePercent × (1 +
   * gstPercent/100)` applied to the whole refund, ignoring the ₹10 cap and the
   * stored `order.platformFee`. And this is the WORSE of the two, because this
   * is the function whose output is shown to the BUYER before they confirm a
   * cancellation: it quoted a net refund ₹106 short on a ₹5,000 order.
   *
   * Found by grepping for the shape rather than the name — the plan cited
   * `refund-actions.ts:104-110`, which is the other one. Root Cause #75's
   * lesson exactly: a rule reachable by copy-paste gets copied, and the copy
   * is not found by searching for the function that was supposed to own it.
   *
   * ── 2026-10-21: and `refundCapacity`, not `totalPrice − withheld` ─────────
   *
   * 🛑 The net figure now subtracts refunds ALREADY COMMITTED on this order,
   * because `cancelOrderWithRefund` moves exactly `refundCapacity().remaining`
   * — so if these two expressions differ, the number shown to the buyer is not
   * the number that moves, which is the whole defect D14 is about.
   *
   * They differ on precisely one order: a partially-refunded one. The old
   * expression ignored prior refunds, so cancelling an order that had already
   * had a line refunded quoted the buyer the full base a second time. That
   * would not have over-paid — `reserveRefund`'s transactional cap refuses it
   * — but it would have quoted a figure and then failed, which is a worse
   * experience than quoting the right one.
   *
   * On an order with no prior refunds the two are identical, so nothing changes
   * for the common case.
   */
  const capacity = refundCapacity(order, gstPercent);
  const grossRefund = order.totalPrice;
  const feeDeducted = capacity.withheld;
  const netRefund = capacity.remaining;

  return {
    orderId,
    grossRefund,
    feeDeducted,
    netRefund,
    currency: order.currency,
  };
}
