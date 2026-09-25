/**
 * @mohasinac/payment-phonepe — PhonePe Standard Checkout v2 IPaymentProvider implementation
 *
 * Implements the @mohasinac/contracts IPaymentProvider interface using the
 * official `phonepe-pg-sdk-node` package. Accepts credentials via
 * constructor — no Firestore or DB dependency (mirrors `payment-manual`'s
 * shape, not the old `payment-razorpay` three-layer file: every caller goes
 * through `getProviders().payment`, there is no separate "deprecated
 * standalone helper" bypass layer here).
 *
 * PhonePe's flow differs from a client-side-modal gateway in two structural
 * ways every caller of this provider must account for:
 *
 *   1. `createOrder()` returns a `checkoutUrl` (PhonePe's `redirectUrl`) —
 *      the browser opens/embeds this page. There is no publishable key to
 *      hand the client and no client-side signature to verify afterward.
 *   2. The definitive payment result is never returned to the browser. The
 *      caller must poll `getOrder()`/`capturePayment()` (both wrap PhonePe's
 *      Order Status API) or rely on the webhook (`verifyWebhook`) as the
 *      source of truth.
 *
 * @example
 * ```ts
 * import { PhonePeProvider } from "@mohasinac/payment-phonepe";
 * import { registerProviders } from "../../contracts";
 *
 * registerProviders({
 *   payment: new PhonePeProvider({
 *     clientId: process.env.PHONEPE_CLIENT_ID!,
 *     clientSecret: process.env.PHONEPE_CLIENT_SECRET!,
 *     clientVersion: process.env.PHONEPE_CLIENT_VERSION ?? "1",
 *     environment: (process.env.PHONEPE_ENVIRONMENT as "sandbox" | "production") ?? "sandbox",
 *     webhookUsername: process.env.PHONEPE_WEBHOOK_USERNAME,
 *     webhookPassword: process.env.PHONEPE_WEBHOOK_PASSWORD,
 *   }),
 * });
 * ```
 */

import { randomBytes } from "crypto";
import {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  RefundRequest,
  MetaInfo,
  Env,
} from "phonepe-pg-sdk-node";
import type { JsonValue } from "@mohasinac/appkit";
import { IPaymentProvider } from "../../contracts";
import type { PaymentOrder, PaymentCapture, Refund } from "../../contracts";
import { getDefaultCurrency } from "../../core/baseline-resolver";
import { normalizeError } from "../../errors/normalize";

/**
 * PhonePe's `metaInfo` (udf1-udf5, ≤256 chars each) is the only channel that
 * survives from `createOrder()` through to BOTH the Order Status API AND the
 * webhook payload. Checkout uses it to carry the buyer's checkout intent
 * (uid / addressId / outOfStockPolicy / notes) so the webhook — which fires
 * with no buyer session — can place the order on its own if the buyer closes
 * the tab mid-payment. See `confirmAndPlacePhonePeOrderAction` in
 * `_internal/server/features/checkout/actions.ts`.
 */
export interface PhonePeCheckoutIntent {
  uid: string;
  addressId?: string;
  outOfStockPolicy?: string;
  notes?: string;
}

function packMetaInfo(intent: PhonePeCheckoutIntent): MetaInfo {
  return MetaInfo.builder()
    .udf1(intent.uid)
    .udf2(intent.addressId ?? "")
    .udf3(intent.outOfStockPolicy ?? "")
    .udf4((intent.notes ?? "").slice(0, 256))
    .udf5("")
    .build();
}

function unpackMetaInfo(meta: MetaInfo | undefined): PhonePeCheckoutIntent | undefined {
  if (!meta?.udf1) return undefined;
  return {
    uid: meta.udf1,
    addressId: meta.udf2 || undefined,
    outOfStockPolicy: meta.udf3 || undefined,
    notes: meta.udf4 || undefined,
  };
}

export interface PhonePeConfig {
  clientId: string;
  clientSecret: string;
  /** PhonePe's client version — a small integer, stored as a string across this codebase's credential convention. */
  clientVersion: string;
  environment: "sandbox" | "production";
  /** Username/password configured in PhonePe's dashboard Webhook tab (SHA/Basic auth mode). Required for `verifyWebhook()` to do anything but return `false`. */
  webhookUsername?: string;
  webhookPassword?: string;
}

/** merchantOrderId / merchantRefundId — ≤63 chars, `_`/`-` only (PhonePe constraint). */
function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function mapOrderState(state: string): "created" | "attempted" | "paid" | "failed" {
  switch (state) {
    case "COMPLETED":
      return "paid";
    case "FAILED":
      return "failed";
    case "PENDING":
      return "attempted";
    default:
      return "created";
  }
}

// --- IPaymentProvider implementation ------------------------------------------

export class PhonePeProvider extends IPaymentProvider {
  readonly name = "phonepe";
  private readonly client: StandardCheckoutClient;
  private readonly webhookUsername?: string;
  private readonly webhookPassword?: string;

  constructor(config: PhonePeConfig) {
    super();
    const env = config.environment === "production" ? Env.PRODUCTION : Env.SANDBOX;
    this.client = StandardCheckoutClient.getInstance(
      config.clientId,
      config.clientSecret,
      Number.parseInt(config.clientVersion, 10) || 1,
      env,
    );
    this.webhookUsername = config.webhookUsername;
    this.webhookPassword = config.webhookPassword;
  }

  /**
   * Creates a PhonePe order and returns its hosted checkout page.
   *
   * `metadata.redirectUrl` is REQUIRED — PhonePe's API mandates a
   * `merchantUrls.redirectUrl` on every order (used only as the fallback
   * destination if the buyer's browser degrades out of IFRAME mode into a
   * full page navigation). `metadata.uid` is REQUIRED — it (plus the
   * optional `addressId`/`outOfStockPolicy`/`notes`) is packed into
   * PhonePe's `metaInfo` so the webhook can reconstruct and place the order
   * with no buyer session (see `PhonePeCheckoutIntent` above). The returned
   * `PaymentOrder.id` is OUR generated `merchantOrderId` — the key every
   * subsequent lookup (status, refund, webhook correlation) uses.
   */
  async createOrder(
    amount: number,
    currency?: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<PaymentOrder> {
    const redirectUrl = metadata?.redirectUrl;
    if (typeof redirectUrl !== "string" || !redirectUrl) {
      throw new Error("PhonePeProvider.createOrder requires metadata.redirectUrl");
    }
    const uid = metadata?.uid;
    if (typeof uid !== "string" || !uid) {
      throw new Error("PhonePeProvider.createOrder requires metadata.uid");
    }
    const merchantOrderId = generateId("ord");
    const metaInfo = packMetaInfo({
      uid,
      addressId: typeof metadata?.addressId === "string" ? metadata.addressId : undefined,
      outOfStockPolicy: typeof metadata?.outOfStockPolicy === "string" ? metadata.outOfStockPolicy : undefined,
      notes: typeof metadata?.notes === "string" ? metadata.notes : undefined,
    });
    const payRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)
      .redirectUrl(redirectUrl)
      .metaInfo(metaInfo)
      .build();
    const response = await this.client.pay(payRequest);
    return {
      id: merchantOrderId,
      amount,
      currency: currency ?? getDefaultCurrency(),
      status: "created",
      metadata,
      createdAt: new Date().toISOString(),
      gatewayOrderId: response.orderId,
      checkoutUrl: response.redirectUrl,
      expiresAt: new Date(response.expireAt).toISOString(),
    };
  }

  /**
   * Validates a webhook request. `signature` is the raw `Authorization`
   * header value; `payload` is the raw request body string. Requires
   * `webhookUsername`/`webhookPassword` to be configured — returns `false`
   * otherwise (same fail-closed shape Razorpay's provider used for a
   * missing webhook secret).
   *
   * This only reports validity — it does NOT return the parsed callback
   * body. Callers that need the parsed event (type + payload) should
   * `JSON.parse` the raw body themselves after this returns `true`, same as
   * the existing webhook route already does.
   */
  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.webhookUsername || !this.webhookPassword) return false;
    try {
      this.client.validateCallback(this.webhookUsername, this.webhookPassword, signature, payload);
      return true;
    } catch (err) {
      void normalizeError(err);
      return false;
    }
  }

  /** Wraps the Order Status API. `orderId` here is our `merchantOrderId`. */
  async capturePayment(orderId: string): Promise<PaymentCapture> {
    const status = await this.client.getOrderStatus(orderId, true);
    return {
      id: orderId,
      orderId: status.orderId,
      amount: status.amount,
      currency: getDefaultCurrency(),
      status: status.state === "COMPLETED" ? "captured" : "failed",
      capturedAt: new Date().toISOString(),
      transactionId: status.paymentDetails?.[0]?.transactionId,
    };
  }

  /**
   * Initiates a refund. `paymentId` here is actually the original
   * `merchantOrderId` — PhonePe refunds are order-keyed
   * (`originalMerchantOrderId`), not payment-keyed. The inherited parameter
   * name from `IPaymentProvider` is misleading for this provider; kept only
   * because the base contract is shared with `ManualPaymentProvider`.
   */
  async refund(paymentId: string, amount?: number): Promise<Refund> {
    if (amount === undefined) {
      throw new Error("PhonePeProvider.refund requires an explicit amount (paise) — PhonePe has no whole-order refund shorthand");
    }
    const merchantRefundId = generateId("rfnd");
    const refundRequest = RefundRequest.builder()
      .merchantRefundId(merchantRefundId)
      .originalMerchantOrderId(paymentId)
      .amount(amount)
      .build();
    const result = await this.client.refund(refundRequest);
    return {
      id: result.refundId,
      paymentId,
      amount: result.amount,
      currency: getDefaultCurrency(),
      status: result.state === "COMPLETED" ? "processed" : result.state === "FAILED" ? "failed" : "pending",
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Wraps the Order Status API. `orderId` here is our `merchantOrderId`.
   * `metadata` is the buyer's checkout intent, unpacked from PhonePe's
   * `metaInfo` — the primary reason the checkout action calls this rather
   * than `capturePayment()` when confirming a payment.
   */
  async getOrder(orderId: string): Promise<PaymentOrder> {
    const status = await this.client.getOrderStatus(orderId, true);
    const intent = unpackMetaInfo(status.metaInfo);
    return {
      id: orderId,
      amount: status.amount,
      currency: getDefaultCurrency(),
      status: mapOrderState(status.state),
      createdAt: new Date().toISOString(),
      gatewayOrderId: status.orderId,
      transactionId: status.paymentDetails?.[0]?.transactionId,
      metadata: intent as unknown as Record<string, JsonValue> | undefined,
    };
  }
}
