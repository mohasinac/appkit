// --- Payment Shared Types -----------------------------------------------------

import type { JsonValue } from "../schemas/types";

export interface PaymentOrder {
  /** Our own order id — a merchant-order id for gateways that are order-keyed rather than payment-keyed (e.g. PhonePe). */
  id: string;
  amount: number;
  currency: string;
  status: "created" | "attempted" | "paid" | "failed";
  receipt?: string;
  metadata?: Record<string, JsonValue>;
  createdAt: string; // ISO-8601
  /** The gateway's OWN order id, when distinct from `id` (PhonePe returns both its own `orderId` and echoes back our `merchantOrderId`). Optional — Razorpay's own id WAS `id`, so this stays unset for gateways where the two coincide. */
  gatewayOrderId?: string;
  /** URL the buyer's browser opens/embeds to complete payment (PhonePe's `redirectUrl`). Optional — gateways using a client-side modal with no hosted page (Razorpay) never set this. */
  checkoutUrl?: string;
  /** The gateway's own transaction id for the underlying payment attempt, when it has one distinct from `id`/`gatewayOrderId` (PhonePe's `paymentDetails[].transactionId`). */
  transactionId?: string;
  /** When this order/attempt expires, if the gateway reports one (PhonePe's `expireAt`). ISO-8601. */
  expiresAt?: string;
}

export interface PaymentCapture {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "captured" | "failed";
  capturedAt: string; // ISO-8601
  /** The gateway's own transaction id for this capture attempt, when it has one distinct from `id`/`orderId` (PhonePe's `paymentDetails[].transactionId`). */
  transactionId?: string;
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
 * plain interface so every provider (manual, PhonePe, and any future
 * gateway) extends one shared type — adding a new provider is a subclass,
 * not a fresh reimplementation of the shape.
 *
 * Implemented by the manual provider (default) and PhonePe.
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
