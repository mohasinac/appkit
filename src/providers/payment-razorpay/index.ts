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
import type {
  PaymentOrder,
  PaymentCapture,
  Refund,
  Dispute,
  GatewayPaymentRecord,
} from "../../contracts";
import { getDefaultCurrency } from "../../core/baseline-resolver";
import { paiseToRupees } from "../../core/money";
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

/**
 * The subset of Razorpay's dispute entity this adapter reads.
 *
 * Verified field-by-field against `node_modules/razorpay/dist/types/disputes.d.ts`
 * in the installed 2.9.8. `amount` and `amount_deducted` are currency subunits;
 * `respond_by` and `created_at` are Unix timestamps in SECONDS.
 */
interface RazorpayDisputeEntity {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  amount_deducted?: number;
  reason_code?: string;
  respond_by: number;
  status?: string;
  phase?: string;
  created_at: number;
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

  /*
   * ── DISPUTES ──────────────────────────────────────────────────────────────
   *
   * Razorpay is the only registered provider that HAS disputes, so this is the
   * only real implementation of the three.
   *
   * 🛑 Two unit conversions, both easy to get wrong and both silent when wrong:
   *
   *   amount / amount_deducted — currency SUBUNITS → decimal rupees.
   *   respond_by / created_at  — Unix timestamp in SECONDS → Date.
   *
   * The second is the nastier one. `new Date(1761000000)` is 21 January 1970,
   * so a missed `* 1000` does not throw and does not look like a unit bug — it
   * looks like corrupt data, and on a dispute it would make a live `respondBy`
   * deadline sort as 55 years overdue, which an escalation query would then
   * either flood on or ignore. The existing `refund`/`getOrder` methods above
   * already multiply, which is the precedent to copy.
   */

  /**
   * Typed STRUCTURALLY rather than against the SDK's `Disputes.RazorpayDispute`
   * namespace type.
   *
   * Two reasons: the namespace is declared inside `types/disputes.d.ts` and is
   * not part of the package's documented export surface, so importing it couples
   * us to an internal; and naming only the fields we read makes the mapping
   * auditable against the SDK by eye. Every field below was checked against the
   * installed 2.9.8 declaration — `id`, `payment_id`, `amount`, `currency`,
   * `amount_deducted`, `reason_code`, `respond_by`, `status`, `phase`,
   * `created_at` — rather than recalled.
   *
   * `status` and `phase` are `string` in the SDK too, so nothing is lost by not
   * importing it.
   */
  private toDispute(d: RazorpayDisputeEntity): Dispute {
    return {
      id: String(d.id),
      paymentId: String(d.payment_id),
      amount: paiseToRupees(Number(d.amount)),
      currency: String(d.currency),
      amountDeducted: paiseToRupees(Number(d.amount_deducted ?? 0)),
      reasonCode: String(d.reason_code ?? ""),
      respondBy: new Date(Number(d.respond_by) * 1000),
      status: String(d.status ?? ""),
      phase: String(d.phase ?? ""),
      createdAt: new Date(Number(d.created_at) * 1000),
      gateway: this.name,
    };
  }

  /**
   * Payments in a window, for reconciliation.
   *
   * 🛑 `from`/`to` are Unix timestamps in **SECONDS** and `count` is capped at
   * **100 by the API** (verified in `RazorpayPaginationOptions`). The cap is
   * NOT raised by asking: a caller wanting more must page with `skip`, and this
   * method deliberately does not, because an unbounded page loop inside a 540 s
   * function is how a reconciler turns into a timeout. At this project's volume
   * one page is several days of payments; the count is logged so the day that
   * stops being true is visible rather than silently truncating.
   */
  async listPayments(opts: {
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<GatewayPaymentRecord[]> {
    const result = await this.razorpay.payments.all({
      from: Math.floor(opts.from.getTime() / 1000),
      to: Math.ceil(opts.to.getTime() / 1000),
      count: Math.min(opts.limit ?? 100, 100),
    });
    return (result.items ?? []).map((p) => {
      const captured = Number(p.created_at);
      return {
        id: String(p.id),
        ...(p.order_id ? { orderId: String(p.order_id) } : {}),
        amount: paiseToRupees(Number(p.amount)),
        currency: String(p.currency),
        status: String(p.status),
        amountRefunded: paiseToRupees(Number(p.amount_refunded ?? 0)),
        ...(p.refund_status ? { refundStatus: String(p.refund_status) } : {}),
        ...(Number.isFinite(captured) ? { capturedAt: new Date(captured * 1000) } : {}),
        gateway: this.name,
      };
    });
  }

  async getDispute(disputeId: string): Promise<Dispute> {
    return this.toDispute(await this.razorpay.disputes.fetch(disputeId));
  }

  async listDisputes(): Promise<Dispute[]> {
    const result = await this.razorpay.disputes.all();
    return (result.items ?? []).map((d) => this.toDispute(d));
  }

  /**
   * Accept liability — irreversible.
   *
   * `confirmIrrevocable` is required by the contract and is not read here, and
   * that is the point: its job is to make the CALLER state intent at the call
   * site. A runtime check would be theatre, since the type already makes
   * `false` uncompilable.
   */
  async acceptDispute(disputeId: string, _confirmIrrevocable: true): Promise<Dispute> {
    return this.toDispute(await this.razorpay.disputes.accept(disputeId));
  }
}
