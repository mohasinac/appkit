/**
 * @mohasinac/payment-manual — the default IPaymentProvider implementation.
 *
 * There is no gateway here: the buyer pays via bank transfer / UPI outside
 * the app and uploads a reference (UTR) + proof image, which the seller or
 * admin manually confirms. This mirrors the `paymentProofUrl` /
 * `paymentTransactionId` fields already on `OrderDocument` — this class
 * formalizes that flow behind the `IPaymentProvider` contract so callers
 * that go through `getProviders().payment` get a real implementation
 * instead of `undefined`.
 *
 * In-memory bookkeeping only — there is no external system of record.
 * The order document itself (`paymentStatus`,
 * `paymentTransactionId`, `paymentProofUrl`) is the actual source of truth;
 * this provider is a thin, self-consistent adapter for code that talks to
 * `IPaymentProvider` generically rather than the order repository directly.
 */

import { randomBytes } from "node:crypto";
import { IPaymentProvider } from "../../contracts";
import type {
  PaymentOrder,
  PaymentCapture,
  Refund,
  Dispute,
  GatewayPaymentRecord,
} from "../../contracts";
import type { JsonValue } from "../../schemas/types";

export class ManualPaymentProvider extends IPaymentProvider {
  readonly name = "manual";
  private readonly orders = new Map<string, PaymentOrder>();
  private readonly captures = new Map<string, PaymentCapture>();

  async createOrder(
    amount: number,
    currency: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<PaymentOrder> {
    const order: PaymentOrder = {
      id: `manual_order_${randomBytes(8).toString("hex")}`,
      amount,
      currency,
      status: "created",
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    return order;
  }

  /** Manual payments have no webhook source — always false. */
  verifyWebhook(_payload: string, _signature: string): boolean {
    return false;
  }

  /**
   * Manual payments are considered captured the moment the buyer's
   * reference/proof is recorded — there is no separate auth+capture step.
   */
  async capturePayment(orderId: string): Promise<PaymentCapture> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw Object.assign(new Error(`Manual order not found: ${orderId}`), {
        httpStatus: 404,
      });
    }
    const capture: PaymentCapture = {
      id: `manual_pay_${randomBytes(8).toString("hex")}`,
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

  /**
   * Records the refund as pending — the actual money movement happens via
   * bank transfer outside the system and is reconciled manually by an
   * admin, same as the rest of the manual-payment flow.
   */
  async refund(paymentId: string, amount?: number): Promise<Refund> {
    const capture = this.captures.get(paymentId);
    return {
      id: `manual_rfnd_${randomBytes(8).toString("hex")}`,
      paymentId,
      amount: amount ?? capture?.amount ?? 0,
      currency: capture?.currency ?? "INR",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  async getOrder(orderId: string): Promise<PaymentOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw Object.assign(new Error(`Manual order not found: ${orderId}`), {
        httpStatus: 404,
      });
    }
    return order;
  }

  /*
   * ── DISPUTES: THERE IS NO SUCH THING HERE ─────────────────────────────────
   *
   * A manual payment is a bank transfer or cash the buyer made outside the
   * system, reconciled by an admin against an uploaded proof. There is no
   * card network and no acquirer, so there is no chargeback mechanism to
   * query — a buyer's complaint arrives as a support ticket or a grievance,
   * which is a different (and human) path.
   *
   * 🛑 `listDisputes()` returning `[]` is therefore a FACT, not a silent
   * degrade: "this provider cannot have chargebacks" is true. The single-
   * dispute getters throw, because being ASKED for a specific dispute id on a
   * provider that has none means the caller is confused, and answering a
   * confident wrong thing is how a reconciler reports clean.
   */

  /**
   * 🛑 `[]` here means "THIS PROVIDER CANNOT ANSWER", not "there are no
   * payments" — and the difference decides whether a reconciler may conclude
   * anything. A manual payment exists only as a row we wrote plus a proof the
   * buyer uploaded; there is no external ledger to compare against, so the
   * gateway-vs-us check is structurally inapplicable rather than clean.
   *
   * The caller is required to treat an empty list as no information (see the
   * contract), which is why this is honest rather than a silent degrade.
   */
  async listPayments(): Promise<GatewayPaymentRecord[]> {
    return [];
  }

  async getDispute(disputeId: string): Promise<Dispute> {
    throw Object.assign(
      new Error(
        `Manual payments have no dispute mechanism — nothing can be fetched for ${disputeId}`,
      ),
      { httpStatus: 400 },
    );
  }

  async listDisputes(): Promise<Dispute[]> {
    return [];
  }

  async acceptDispute(disputeId: string, _confirmIrrevocable: true): Promise<Dispute> {
    throw Object.assign(
      new Error(`Manual payments have no dispute to accept (${disputeId})`),
      { httpStatus: 400 },
    );
  }
}
