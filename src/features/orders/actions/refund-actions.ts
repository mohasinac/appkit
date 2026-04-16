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
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { notificationRepository } from "../../admin/repository/notification.repository";

const DEFAULT_PROCESSING_FEE_PERCENT = 2.36;

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
  if (order.refundStatus === "completed")
    throw new ValidationError("Order has already been fully refunded.");

  const settings = await siteSettingsRepository.getSingleton();
  const feePercent =
    settings.commissions?.processingFeePercent ??
    DEFAULT_PROCESSING_FEE_PERCENT;

  const grossRefund = order.totalPrice;
  const feeDeducted = deductFees
    ? parseFloat(((grossRefund * feePercent) / 100).toFixed(2))
    : 0;
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

  await notificationRepository.create({
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
  const feePercent =
    settings.commissions?.processingFeePercent ??
    DEFAULT_PROCESSING_FEE_PERCENT;

  const grossRefund = order.totalPrice;
  const feeDeducted = parseFloat(((grossRefund * feePercent) / 100).toFixed(2));
  const netRefund = parseFloat((grossRefund - feeDeducted).toFixed(2));

  return {
    orderId,
    grossRefund,
    feeDeducted,
    netRefund,
    currency: order.currency,
  };
}
