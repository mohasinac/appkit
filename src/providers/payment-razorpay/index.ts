import "server-only";

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
import { getDefaultCurrency } from "../../core/baseline-resolver";

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
    currency?: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentOrder> {
    const resolvedCurrency = currency ?? getDefaultCurrency();
    const order = await this.razorpay.orders.create({
      amount,
      currency: resolvedCurrency,
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

// ─── Standalone API helpers (auto-credential resolution via resolveKeys) ──────
// These resolve credentials from Firestore → env fallback so callers don't
// need to instantiate RazorpayProvider or pass credentials explicitly.

import { resolveKeys } from "../../core/integration-keys";

export interface RazorpayOrderOptions {
  /** Amount in paise (smallest currency unit). E.g. ₹500 → 50000 */
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: string;
  attempts: number;
  created_at: number;
}

export interface RazorpayRefundResult {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
}

async function getRazorpayInstance(): Promise<Razorpay> {
  const keys = await resolveKeys();
  if (!keys.razorpayKeyId || !keys.razorpayKeySecret) {
    throw new Error(
      "Razorpay credentials are missing. Configure them in Admin › Site Settings › Credentials, or set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local",
    );
  }
  return new Razorpay({
    key_id: keys.razorpayKeyId,
    key_secret: keys.razorpayKeySecret,
  });
}

/** Create a Razorpay order. Credentials resolved from Firestore → env. */
export async function createRazorpayOrder(
  opts: RazorpayOrderOptions,
): Promise<RazorpayOrder> {
  const razorpay = await getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount: opts.amount,
    currency: opts.currency ?? getDefaultCurrency(),
    receipt: opts.receipt ?? `rcpt_${Date.now()}`,
    notes: opts.notes,
  });
  return order as unknown as RazorpayOrder;
}

/** Fetch an existing Razorpay order by ID. */
export async function fetchRazorpayOrder(
  orderId: string,
): Promise<RazorpayOrder> {
  const razorpay = await getRazorpayInstance();
  const order = await razorpay.orders.fetch(orderId);
  return order as unknown as RazorpayOrder;
}

/**
 * Verify Razorpay payment signature — auto-resolves key secret.
 * Returns false if credentials are unavailable.
 */
export async function verifyPaymentSignatureWithKeys(
  params: RazorpayPaymentResult,
): Promise<boolean> {
  const { razorpayKeySecret } = await resolveKeys();
  if (!razorpayKeySecret) return false;
  return verifyPaymentSignature(params, razorpayKeySecret);
}

/**
 * Verify Razorpay webhook signature — auto-resolves webhook secret.
 * Uses HMAC-SHA256 over raw body.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
): Promise<boolean> {
  const { razorpayWebhookSecret } = await resolveKeys();
  if (!razorpayWebhookSecret) {
    throw new Error("Razorpay webhook secret is not configured");
  }
  const expected = createHmac("sha256", razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  if (receivedSignature.length !== 64) return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(receivedSignature, "hex"),
  );
}

/** Create a full or partial refund for a Razorpay payment. */
export async function createRazorpayRefund(
  paymentId: string,
  amountPaise?: number,
): Promise<RazorpayRefundResult> {
  const razorpay = await getRazorpayInstance();
  const opts: Record<string, unknown> = {};
  if (amountPaise) opts.amount = amountPaise;
  const refund = await razorpay.payments.refund(
    paymentId,
    opts as Parameters<typeof razorpay.payments.refund>[1],
  );
  return refund as unknown as RazorpayRefundResult;
}
