// --- Payment Shared Types -----------------------------------------------------

import type { JsonValue } from "../schemas/types";

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "attempted" | "paid" | "failed";
  receipt?: string;
  metadata?: Record<string, JsonValue>;
  createdAt: string; // ISO-8601
}

export interface PaymentCapture {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "captured" | "failed";
  capturedAt: string; // ISO-8601
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: "pending" | "processed" | "failed";
  reason?: string;
  createdAt: string; // ISO-8601
}

// --- Payment Contract -----------------------------------------------------

/**
 * Payment gateway adapter contract. An abstract base class rather than a
 * plain interface so every provider (manual, Razorpay, and any future
 * gateway) extends one shared type — adding a new provider is a subclass,
 * not a fresh reimplementation of the shape.
 *
 * Implemented by the manual provider (default), Razorpay, and their mocks.
 */
export abstract class IPaymentProvider {
  /** Short discriminator used by admin dev tooling to confirm which provider is registered. */
  abstract readonly name: string;
  abstract createOrder(
    amount: number,
    currency: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<PaymentOrder>;
  /** Returns true if the webhook signature is valid. */
  abstract verifyWebhook(payload: string, signature: string): boolean;
  abstract capturePayment(orderId: string): Promise<PaymentCapture>;
  abstract refund(paymentId: string, amount?: number): Promise<Refund>;
  abstract getOrder(orderId: string): Promise<PaymentOrder>;
}
