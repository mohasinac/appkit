/**
 * @mohasinac/payment-razorpay — Razorpay IPaymentProvider implementation
 *
 * Implements the @mohasinac/contracts IPaymentProvider interface.
 * Accepts credentials via constructor — no Firestore or DB dependency.
 *
 * @example
 * ```ts
 * import { RazorpayProvider } from "@mohasinac/payment-razorpay";
 * import { registerProviders } from "../../contracts";
 *
 * registerProviders({
 *   payment: new RazorpayProvider({
 *     keyId: process.env.RAZORPAY_KEY_ID!,
 *     keySecret: process.env.RAZORPAY_KEY_SECRET!,
 *     webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
 *   }),
 * });
 * ```
 */

import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";
import type {
  IPaymentProvider,
  PaymentOrder,
  PaymentCapture,
  Refund,
} from "../../contracts";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

// ─── IPaymentProvider implementation ──────────────────────────────────────────

export class RazorpayProvider implements IPaymentProvider {
  private readonly razorpay: Razorpay;
  private readonly webhookSecret?: string;

  constructor(config: RazorpayConfig) {
    this.razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
    this.webhookSecret = config.webhookSecret;
  }

  async createOrder(
    amount: number,
    currency = "INR",
    metadata?: Record<string, unknown>,
  ): Promise<PaymentOrder> {
    const order = await this.razorpay.orders.create({
      amount,
      currency,
      notes: metadata as Record<string, string> | undefined,
    });
    return {
      id: String(order.id),
      amount: Number(order.amount),
      currency: String(order.currency),
      status: "created",
      receipt: order.receipt ?? undefined,
      metadata,
      createdAt: new Date(Number(order.created_at) * 1000).toISOString(),
    };
  }

  /**
   * Verify Razorpay webhook signature (HMAC-SHA256 over raw body).
   * Requires webhookSecret to be set in the constructor.
   */
  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("hex");
    if (signature.length !== 64 || expected.length !== 64) return false;
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  }

  async capturePayment(paymentId: string): Promise<PaymentCapture> {
    const payment = await this.razorpay.payments.fetch(paymentId);
    return {
      id: String(payment.id),
      orderId: String(payment.order_id ?? ""),
      amount: Number(payment.amount),
      currency: String(payment.currency),
      status: payment.status === "captured" ? "captured" : "failed",
      capturedAt: new Date().toISOString(),
    };
  }

  async refund(paymentId: string, amount?: number): Promise<Refund> {
    const refundData: Record<string, unknown> = {};
    if (amount !== undefined) refundData.amount = amount;
    const result = await this.razorpay.payments.refund(
      paymentId,
      refundData as Parameters<typeof this.razorpay.payments.refund>[1],
    );
    return {
      id: String(result.id),
      paymentId,
      amount: Number(result.amount),
      currency: String(result.currency),
      status: result.status === "processed" ? "processed" : "pending",
      createdAt: new Date(Number(result.created_at) * 1000).toISOString(),
    };
  }

  async getOrder(orderId: string): Promise<PaymentOrder> {
    const order = await this.razorpay.orders.fetch(orderId);
    return {
      id: String(order.id),
      amount: Number(order.amount),
      currency: String(order.currency),
      status: "created",
      receipt: order.receipt ?? undefined,
      createdAt: new Date(Number(order.created_at) * 1000).toISOString(),
    };
  }
}

// ─── Utility exports ──────────────────────────────────────────────────────────

/** Convert rupees (float) → paise (integer) for Razorpay amount field */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert paise (integer) → rupees (float) */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Verify Razorpay payment signature.
 * Uses HMAC-SHA256 over `{orderId}|{paymentId}` with the key secret.
 */
export function verifyPaymentSignature(
  params: RazorpayPaymentResult,
  keySecret: string,
): boolean {
  if (!keySecret) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`)
    .digest("hex");
  if (params.razorpay_signature.length !== 64) return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(params.razorpay_signature, "hex"),
  );
}
