"use server";

/**
 * processRefundAction — append a refund event to an order.
 *
 * Supports two paths:
 *  - Razorpay: calls the payment provider's `refund()` method, then records
 *    the razorpayRefundId on the event.
 *  - Manual: no payment-provider call; records manualTransactionId + optional
 *    proof document URL.
 *
 * Both paths require `confirmIrrevocable: true` from the caller to prevent
 * accidental use — callers must acknowledge the action is non-reversible.
 *
 * Setting `contestable` to false is a side-effect of `orderRepository.postRefundEvent`.
 */

import { randomUUID } from "crypto";
import { getProviders } from "../../../../contracts/registry";
import { orderRepository } from "../../../..";
import { NotFoundError, ValidationError } from "../../../../errors";
import type { OrderRefundEvent, RefundType } from "../../../../features/orders/schemas";
import { applyRefundDeductionAction } from "../payouts/actions";

export type ProcessRefundInput = {
  orderId: string;
  type: RefundType;
  /** Amount in paise. Must be > 0 and ≤ remaining refundable amount on the order. */
  amountInPaise: number;
  reason: string;
  /** Product/item ids affected (for partial refunds). */
  itemIds?: string[];
  /** Required: caller must explicitly confirm this action is irrevocable. */
  confirmIrrevocable: true;
  /** uid of the user processing the refund (admin / seller). */
  refundedBy: string;
} & (
  | {
      method: "razorpay";
      /** Razorpay paymentId from the order (order.paymentId). */
      razorpayPaymentId: string;
      manualTransactionId?: never;
      proofDocumentUrl?: never;
      proofDocumentMimeType?: never;
    }
  | {
      method: "manual";
      razorpayPaymentId?: never;
      manualTransactionId?: string;
      proofDocumentUrl?: string;
      proofDocumentMimeType?: string;
    }
);

export async function processRefundAction(
  input: ProcessRefundInput,
): Promise<{ success: true; refundId: string }> {
  const order = await orderRepository.findById(input.orderId);
  if (!order) throw new NotFoundError(`Order ${input.orderId} not found`);

  if (input.amountInPaise <= 0) throw new ValidationError("Refund amount must be positive");
  if (input.amountInPaise > order.totalPrice) {
    throw new ValidationError("Refund amount exceeds order total");
  }

  // Guard: non-refundable orders (prize draws, bundles).
  if (order.isNonRefundable) {
    throw new ValidationError("This order is marked non-refundable and cannot be refunded.");
  }

  const refundId = randomUUID();
  const now = new Date();
  let razorpayRefundId: string | undefined;

  if (input.method === "razorpay") {
    const payment = getProviders().payment;
    if (!payment) throw new ValidationError("Payment provider not configured");
    const result = await payment.refund(input.razorpayPaymentId, input.amountInPaise);
    razorpayRefundId = result.id;
  }

  const isFull = input.amountInPaise >= order.totalPrice;

  const event: OrderRefundEvent = {
    refundId,
    type: input.type,
    amount: input.amountInPaise,
    ...(input.itemIds?.length ? { itemIds: input.itemIds } : {}),
    reason: input.reason,
    refundedAt: now,
    refundedBy: input.refundedBy,
    ...(razorpayRefundId ? { razorpayRefundId } : {}),
    ...(input.method === "manual" && input.manualTransactionId
      ? { manualTransactionId: input.manualTransactionId }
      : {}),
    ...(input.method === "manual" && input.proofDocumentUrl
      ? {
          proofDocumentUrl: input.proofDocumentUrl,
          proofDocumentMimeType: input.proofDocumentMimeType,
        }
      : {}),
  };

  await orderRepository.postRefundEvent(input.orderId, event, isFull);

  // Fire-and-forget: deduct from the store's pending payout if one exists.
  // Failure here must not roll back the already-posted refund event.
  if (order.storeId) {
    applyRefundDeductionAction({
      storeId: order.storeId,
      orderId: input.orderId,
      refundId,
      refundedAmountInPaise: input.amountInPaise,
      reason: input.reason,
    }).catch(() => {/* payout deduction is best-effort */});
  }

  return { success: true, refundId };
}
