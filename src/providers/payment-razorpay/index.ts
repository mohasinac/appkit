/**
 * @mohasinac/payment-razorpay — Razorpay IPaymentProvider implementation
 *
 * Implements the `IPaymentProvider` contract using the official `razorpay`
 * package. Accepts credentials via constructor — no Firestore or DB
 * dependency (same shape as `payment-manual` and `payment-phonepe`).
 *
 * 🛑 This is a RESTORE, not the original file. The pre-2026-10 provider was
 * deleted in "replace Razorpay with PhonePe Standard Checkout v2" and this
 * one is deliberately NOT a revert of it. Three things changed, each because
 * the old shape could not work against the current money path:
 *
 *   1. **`getOrder()` maps the real status.** The old implementation
 *      hardcoded `status: "created"` on every fetch. That was survivable
 *      when the Razorpay path verified a client-side signature and nothing
 *      else, but the current `verifyAndPlaceGatewayOrderAction` treats
 *      `getOrder().status === "paid"` as the authoritative proof of payment
 *      (PhonePe hands the browser nothing verifiable, so that is the only
 *      check it has). A provider that always answers "created" would make
 *      every Razorpay checkout fail verification after a successful charge —
 *      the buyer is debited and gets no order.
 *   2. **`capturePayment()`/`refund()` are ORDER-keyed, tolerantly.** The
 *      rest of this codebase keys gateway lookups on one id — PhonePe's
 *      order-keyed `merchantOrderId` — and stores it as `order.paymentId`.
 *      Razorpay's refund API is payment-keyed (`pay_…`), so rather than
 *      forcing every caller to track a second id, both methods accept EITHER
 *      an `order_…` or a `pay_…` id and resolve the order's captured payment
 *      themselves. See `resolvePaymentId()`.
 *   3. **The three `@deprecated` standalone helpers are gone.** The old file
 *      carried a second, credential-resolving API surface
 *      (`createRazorpayOrder`, `fetchRazorpayOrder`, `createRazorpayRefund`,
 *      …) that bypassed the provider registry entirely. Its own JSDoc said
 *      to use `getProviders().payment` instead, and every live caller now
 *      does. Restoring a bypass layer nothing needs would be reviving the
 *      exact duplication Root Cause #75 is about.
 *
 * Unlike PhonePe, Razorpay uses a client-side modal: `createOrder()` returns
 * no `checkoutUrl`, and the browser opens Razorpay's `checkout.js` with the
 * returned order id plus the PUBLISHABLE key id. The key id is handed to the
 * client by `/api/payment/create-order`, never by this provider.
 *
 * @example
 * ```ts
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
import type { JsonValue } from "@mohasinac/appkit";
import { IPaymentProvider } from "../../contracts";
import type { PaymentOrder, PaymentCapture, Refund } from "../../contracts";
import { getDefaultCurrency } from "../../core/baseline-resolver";
import { verifyWebhookSignature } from "./signature";

export {
  verifyPaymentSignature,
  verifyWebhookSignature,
  type RazorpayPaymentResult,
} from "./signature";

export interface RazorpayConfig {
  /** Publishable key (`rzp_test_…` / `rzp_live_…`). Safe to expose to the browser. */
  keyId: string;
  /** Secret key. Server-only — never returned by any route. */
  keySecret: string;
  /** Webhook signing secret from the Razorpay dashboard's Webhooks tab. `verifyWebhook()` returns false without it. */
  webhookSecret?: string;
}

/** Razorpay's own order status vocabulary → the contract's. */
function mapOrderStatus(status: string): PaymentOrder["status"] {
  switch (status) {
    case "paid":
      return "paid";
    case "attempted":
      return "attempted";
    default:
      return "created";
  }
}

/**
 * Razorpay `notes` is a flat string map (≤15 keys, 256 chars per value), but
 * `createOrder`'s `metadata` is `Record<string, JsonValue>` and the shared
 * create-order route passes PhonePe-shaped keys (`uid`, `redirectUrl`) through
 * it. Flatten what survives and drop what does not, rather than letting a
 * nested object reach the API and 400 the whole checkout.
 */
function toNotes(metadata?: Record<string, JsonValue>): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const notes: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue; // arrays/objects have no representation in notes
    if (Object.keys(notes).length >= 15) break;
    notes[key] = String(value).slice(0, 256);
  }
  return Object.keys(notes).length > 0 ? notes : undefined;
}

// --- IPaymentProvider implementation ------------------------------------------

export class RazorpayProvider extends IPaymentProvider {
  readonly name = "razorpay";
  private readonly razorpay: Razorpay;
  private readonly webhookSecret?: string;

  constructor(config: RazorpayConfig) {
    super();
    if (!config.keyId || !config.keySecret) {
      throw new Error(
        "RazorpayProvider requires keyId and keySecret. Configure them in Admin › Site Settings › Credentials, or set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.",
      );
    }
    this.razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Creates a Razorpay order. `amount` is in PAISE — the smallest currency
   * unit, which is what Razorpay's `amount` field means and what every
   * caller in this codebase already passes (`rupeesToPaise(total)`).
   *
   * The returned `id` is Razorpay's own order id (`order_…`) and is the key
   * every later lookup uses, so `gatewayOrderId` stays unset — the contract
   * reserves that for gateways where the two ids differ. No `checkoutUrl`:
   * Razorpay has no hosted page in this integration, the browser opens its
   * modal instead.
   */
  async createOrder(
    amount: number,
    currency?: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<PaymentOrder> {
    const resolvedCurrency = currency ?? getDefaultCurrency();
    const receipt = typeof metadata?.receipt === "string" ? metadata.receipt : undefined;
    const order = await this.razorpay.orders.create({
      amount,
      currency: resolvedCurrency,
      receipt,
      notes: toNotes(metadata),
    });
    return {
      id: String(order.id),
      amount: Number(order.amount),
      currency: String(order.currency),
      status: mapOrderStatus(String(order.status)),
      receipt: order.receipt ?? undefined,
      metadata,
      createdAt: new Date(Number(order.created_at) * 1000).toISOString(),
    };
  }

  /**
   * Verifies a Razorpay webhook: HMAC-SHA256 hex over the RAW request body,
   * compared against the `x-razorpay-signature` header.
   *
   * Fails closed when no webhook secret is configured — same shape as
   * PhonePe's missing-credential behaviour. The caller must pass the raw
   * body string, not a re-serialised object: `JSON.stringify(JSON.parse(b))`
   * is not guaranteed to reproduce the bytes that were signed.
   */
  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    return verifyWebhookSignature(payload, signature, this.webhookSecret);
  }

  /**
   * Resolves a `pay_…` id for either id shape.
   *
   * Given an `order_…` id, picks that order's captured payment (falling back
   * to an authorized one, which is what a non-auto-capture flow leaves
   * behind). Throws when the order has no such payment, because every caller
   * — capture confirmation and refund alike — is meaningless without one.
   */
  private async resolvePaymentId(id: string): Promise<string> {
    if (!id.startsWith("order_")) return id;
    const { items } = await this.razorpay.orders.fetchPayments(id);
    const payment =
      items.find((p) => p.status === "captured") ?? items.find((p) => p.status === "authorized");
    if (!payment) {
      throw new Error(`Razorpay order ${id} has no captured or authorized payment`);
    }
    return String(payment.id);
  }

  /**
   * Reports the state of the payment behind an order. Accepts our stored
   * order id (`order_…`) or a payment id (`pay_…`) — see the class comment.
   *
   * Named `capturePayment` by the contract, but it does NOT capture: this
   * integration creates orders with Razorpay's default auto-capture, so a
   * successful payment is already captured by the time anything here runs.
   * Issuing a second capture would be an error, not a no-op.
   */
  async capturePayment(orderId: string): Promise<PaymentCapture> {
    const paymentId = await this.resolvePaymentId(orderId);
    const payment = await this.razorpay.payments.fetch(paymentId);
    return {
      id: String(payment.id),
      orderId: String(payment.order_id ?? orderId),
      amount: Number(payment.amount),
      currency: String(payment.currency),
      status: payment.status === "captured" ? "captured" : "failed",
      capturedAt: new Date().toISOString(),
      transactionId: String(payment.id),
    };
  }

  /**
   * Full or partial refund. `amount` is in paise; omit it to refund the whole
   * payment. `paymentId` may be an `order_…` id — Razorpay refunds are
   * payment-keyed but this codebase stores the order id, so it is resolved
   * here rather than at ~6 call sites (see the class comment).
   */
  async refund(paymentId: string, amount?: number): Promise<Refund> {
    const resolvedPaymentId = await this.resolvePaymentId(paymentId);
    const result = await this.razorpay.payments.refund(
      resolvedPaymentId,
      amount === undefined ? {} : { amount },
    );
    return {
      id: String(result.id),
      paymentId: resolvedPaymentId,
      amount: Number(result.amount),
      currency: String(result.currency),
      status:
        result.status === "processed"
          ? "processed"
          : result.status === "failed"
            ? "failed"
            : "pending",
      createdAt: new Date(Number(result.created_at) * 1000).toISOString(),
    };
  }

  /**
   * Fetches an order and reports its REAL status. This is the authoritative
   * "was this paid" check — `verifyAndPlaceGatewayOrderAction` gates order
   * placement on `status === "paid"`, so the mapping here is load-bearing
   * (see point 1 of the class comment).
   */
  async getOrder(orderId: string): Promise<PaymentOrder> {
    const order = await this.razorpay.orders.fetch(orderId);
    return {
      id: String(order.id),
      amount: Number(order.amount),
      currency: String(order.currency),
      status: mapOrderStatus(String(order.status)),
      receipt: order.receipt ?? undefined,
      createdAt: new Date(Number(order.created_at) * 1000).toISOString(),
      /*
       * `notes` round-trips whatever `createOrder` put there, which is how the
       * WEBHOOK path (no buyer session) recovers the checkout intent — the
       * same job PhonePe's `metaInfo` does. Without this the webhook could
       * confirm a payment and then have no uid to place the order for.
       */
      metadata: order.notes as Record<string, JsonValue> | undefined,
    };
  }
}
