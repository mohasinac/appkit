/**
 * `MockRazorpayProvider` — in-process mock implementing `IPaymentProvider`.
 *
 * Replaces the orphaned `/api/dev/mock-razorpay/**` HTTP routes (deleted in
 * Track H). The mock behaviour is preserved bit-for-bit so checkout flows
 * exercise identical wire shapes:
 *
 *   - Order IDs prefix `order_mock_`, payment IDs `pay_mock_`, refund IDs
 *     `rfnd_mock_` — matches the previous route output exactly.
 *   - Webhook signatures use HMAC-SHA256 with the deterministic
 *     `MOCK_WEBHOOK_SECRET` so `verifyWebhook(raw, sig)` returns true for
 *     any signature the mock itself produced.
 *   - In-memory `Map<orderId, PaymentOrder>` survives per process. State is
 *     intentionally not persisted — tests reset between runs by recreating
 *     the provider instance.
 *
 * Mocks-only operations:
 *   - `emitWebhook(event)` synchronously fires a webhook payload through a
 *     consumer-supplied callback so end-to-end tests can drive a
 *     payment.captured / payment.failed / order.paid event without leaving
 *     the process. Registered via `setWebhookSink(fn)`.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  IPaymentProvider,
  PaymentCapture,
  PaymentOrder,
  Refund,
} from "../../../../contracts";
import type { JsonValue } from "../../../../schemas/types";

const MOCK_WEBHOOK_SECRET = "appkit-mock-razorpay-webhook-secret-v1";

export type MockWebhookEvent =
  | "payment.captured"
  | "payment.failed"
  | "order.paid";

export interface MockWebhookPayload {
  readonly event: MockWebhookEvent;
  readonly orderId: string;
  readonly paymentId: string;
  readonly amount: number;
  readonly currency: string;
}

export type WebhookSink = (
  rawBody: string,
  signature: string,
  payload: MockWebhookPayload,
) => Promise<void> | void;

export class MockRazorpayProvider implements IPaymentProvider {
  readonly name = "razorpay-mock" as const;
  private readonly orders = new Map<string, PaymentOrder>();
  private readonly captures = new Map<string, PaymentCapture>();
  private webhookSink: WebhookSink | null = null;

  setWebhookSink(sink: WebhookSink | null): void {
    this.webhookSink = sink;
  }

  async createOrder(
    amount: number,
    currency: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<PaymentOrder> {
    const order: PaymentOrder = {
      id: `order_mock_${randomBytes(8).toString("hex")}`,
      amount,
      currency,
      status: "created",
      receipt: `rcpt_mock_${Date.now()}`,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    return order;
  }

  verifyWebhook(payload: string, signature: string): boolean {
    if (signature.length !== 64) return false;
    const expected = createHmac("sha256", MOCK_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  }

  async capturePayment(orderId: string): Promise<PaymentCapture> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw Object.assign(new Error(`Mock order not found: ${orderId}`), {
        httpStatus: 404,
      });
    }
    const capture: PaymentCapture = {
      id: `pay_mock_${randomBytes(8).toString("hex")}`,
      orderId,
      amount: order.amount,
      currency: order.currency,
      status: "captured",
      capturedAt: new Date().toISOString(),
    };
    this.captures.set(capture.id, capture);
    this.orders.set(orderId, { ...order, status: "paid" });
    return capture;
  }

  async refund(paymentId: string, amount?: number): Promise<Refund> {
    const capture = this.captures.get(paymentId);
    const refund: Refund = {
      id: `rfnd_mock_${randomBytes(8).toString("hex")}`,
      paymentId,
      amount: amount ?? capture?.amount ?? 0,
      currency: capture?.currency ?? "INR",
      status: "processed",
      createdAt: new Date().toISOString(),
    };
    return refund;
  }

  async getOrder(orderId: string): Promise<PaymentOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw Object.assign(new Error(`Mock order not found: ${orderId}`), {
        httpStatus: 404,
      });
    }
    return order;
  }

  /**
   * Mocks-only — fire a webhook event through the consumer-registered sink.
   * Used by `/api/admin/dev/emit-payment-webhook` to drive end-to-end test
   * flows. Throws if no sink is registered.
   */
  async emitWebhook(payload: MockWebhookPayload): Promise<void> {
    if (!this.webhookSink) {
      throw new Error(
        "MockRazorpayProvider.emitWebhook called with no webhook sink registered. " +
          "Call provider.setWebhookSink(handler) at startup.",
      );
    }
    const rawBody = JSON.stringify({
      event: payload.event,
      payload: {
        order: { entity: { id: payload.orderId, amount: payload.amount, currency: payload.currency } },
        payment: { entity: { id: payload.paymentId, amount: payload.amount, currency: payload.currency } },
      },
    });
    const signature = createHmac("sha256", MOCK_WEBHOOK_SECRET).update(rawBody).digest("hex");
    await this.webhookSink(rawBody, signature, payload);
  }
}
