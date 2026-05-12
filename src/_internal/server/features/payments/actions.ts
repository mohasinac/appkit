/**
 * Payments server actions (appkit).
 *
 * Wraps the Razorpay primitives in a single createPaymentIntentAction. The
 * existing /api/payment/create-order route becomes a thin wrapper over this
 * once consumer wiring lands (S7). Webhook + verify routes remain in the
 * consumer because they parse provider-specific request bodies.
 */

import { ApiError } from "../../../../errors";
import { serverLogger } from "../../../../monitoring";
import {
  createRazorpayOrder,
  rupeesToPaise,
  verifyPaymentSignatureWithKeys,
} from "../../../../providers/payment-razorpay/index";
import { getDefaultCurrency } from "../../../../core/index";
import { PAYMENTS_RECEIPT_PREFIX } from "../../../shared/features/payments/config";
import { resolvePaymentFee } from "./data";

export interface CreatePaymentIntentInput {
  userId: string;
  /** Base amount in rupees (the cart total before the Razorpay fee). */
  amount: number;
  currency?: string;
  receipt?: string;
}

export interface CreatePaymentIntentResult {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  platformFee: number;
  baseAmount: number;
}

export async function createPaymentIntentAction(
  input: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new ApiError(500, "Razorpay is not configured on this server");
  }

  const currency = input.currency ?? getDefaultCurrency();
  const fee = await resolvePaymentFee(input.amount);
  const amountInPaise = rupeesToPaise(fee.totalAmount);

  const razorpayOrder = await createRazorpayOrder({
    amount: amountInPaise,
    currency,
    receipt: input.receipt ?? `${PAYMENTS_RECEIPT_PREFIX}${input.userId}_${Date.now()}`,
    notes: { userId: input.userId },
  });

  serverLogger.info(
    `createPaymentIntentAction: ${razorpayOrder.id} uid=${input.userId} base=${fee.baseAmount} fee=${fee.platformFee} total=${fee.totalAmount}`,
  );

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId,
    platformFee: fee.platformFee,
    baseAmount: fee.baseAmount,
  };
}

export interface VerifyPaymentSignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export async function verifyPaymentSignatureAction(
  input: VerifyPaymentSignatureInput,
): Promise<boolean> {
  return verifyPaymentSignatureWithKeys({
    razorpay_order_id: input.orderId,
    razorpay_payment_id: input.paymentId,
    razorpay_signature: input.signature,
  });
}
