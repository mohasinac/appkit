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

/**
 * What the buyer was checking out, round-tripped through the gateway's own
 * metadata so the confirmation path can rebuild the order.
 *
 * 🛑 This lived in `providers/payment-phonepe/index.ts` as
 * `PhonePeCheckoutIntent`, and the name was the only gateway-shaped thing about
 * it — every field is OURS. That naming forced generic checkout code to import
 * a concrete provider for a type, which is the coupling Tier AK A4 exists to
 * remove. PhonePe happens to carry it in `udf1..udf4`; another gateway would
 * carry it some other way, and neither fact belongs in the type's name.
 */
export interface CheckoutIntentMetadata {
  uid: string;
  addressId?: string;
  outOfStockPolicy?: string;
  notes?: string;
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

/**
 * A chargeback / dispute, normalised at the provider boundary.
 *
 * ## Units
 *
 * 🛑 `amount` and `amountDeducted` are **decimal rupees**. Razorpay's own
 * entity reports both in currency SUBUNITS (`RazorpayDispute.amount`), so the
 * adapter converts with `paiseToRupees` and nothing downstream ever sees the
 * subunit figure — `audit-money-units` blocks both the raw `/100` and the word
 * for the subunit in a comment or label.
 *
 * 🛑 **This deliberately differs from `Refund` above, which is in SUBUNITS**,
 * and the inconsistency is real rather than an oversight here: `refund()` takes
 * `rupeesToPaise(input.amount)` from its one call site and returns
 * `Number(result.amount)` unconverted. That is pre-existing and is NOT changed
 * by this type — flipping it would silently alter what every refund consumer
 * reads, which is the money-unit migration's whole cautionary tale. A new
 * surface gets the correct convention; an existing one gets a measured
 * migration or nothing. If you are here because the two look inconsistent:
 * they are, `Dispute` is the right one, and `Refund` is a separate job.
 *
 * 🛑 `respondBy` and `createdAt` are `Date`. Razorpay reports both as **Unix
 * timestamps in SECONDS**, so `new Date(respond_by)` yields 1970 and reads as
 * corrupt data rather than as a unit error — the same trap the Vercel token's
 * `expiresAt` sets. Multiply by 1000 at the boundary, once.
 *
 * ## `status` and `phase` are strings, not unions, on purpose
 *
 * The SDK declares both as `string` (`disputes.d.ts`), and the value set is
 * Razorpay's to change. Inventing a union here would mean a real dispute in a
 * state we did not anticipate either fails a parse or gets asserted into the
 * wrong member — and a dispute is the one record where being wrong has a
 * deadline attached. Treat them as opaque, compare against known values where
 * a decision depends on it, and never exhaustively switch.
 */
export interface Dispute {
  /** The gateway's own dispute id. */
  id: string;
  /** The payment this dispute is against — the join key to our orders. */
  paymentId: string;
  /** Decimal rupees. */
  amount: number;
  currency: string;
  /** Decimal rupees. What the gateway takes from our balance if we lose. */
  amountDeducted: number;
  /** The gateway's reason code, verbatim. */
  reasonCode: string;
  /**
   * The gateway's own deadline for a response. **An external, hard date** — not
   * an SLA we invented — which is why a `paymentCases` row built from a dispute
   * takes its `dueAt` from here and from nowhere else.
   */
  respondBy: Date;
  /** Opaque — see the docstring. */
  status: string;
  /** Opaque — see the docstring. */
  phase: string;
  createdAt: Date;
  /** The provider's short name, so a mixed-gateway queue stays attributable. */
  gateway: string;
}

/**
 * One payment as the GATEWAY sees it — the input to reconciliation.
 *
 * 🛑 This type exists so a reconciler can compare the gateway's view against
 * ours **in the direction that needs no trust in our own code.** Every other
 * check in this system starts from our records and asks whether they are
 * consistent; this one starts from the gateway's and asks whether we have an
 * order at all. That is the only direction that could have detected the
 * 2026-10-21 incident, where our side had nothing to be inconsistent with.
 *
 * `amount`, `amountRefunded` — decimal rupees, converted at the boundary.
 * `capturedAt` — a Date; the gateway reports Unix SECONDS.
 */
export interface GatewayPaymentRecord {
  /** The gateway's payment id. */
  id: string;
  /** The gateway's order id, when the payment is attached to one. */
  orderId?: string;
  /** Decimal rupees. */
  amount: number;
  currency: string;
  /**
   * The gateway's own status string, verbatim and opaque. Razorpay uses
   * `created | authorized | captured | refunded | failed`; treat anything
   * unrecognised as "not captured", which fails toward not drawing a
   * conclusion.
   */
  status: string;
  /** Decimal rupees already refunded against this payment, per the gateway. */
  amountRefunded: number;
  /** `null` | `partial` | `full`, as the gateway reports it. */
  refundStatus?: string;
  capturedAt?: Date;
  gateway: string;
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

  /**
   * Listing types this gateway's own merchant terms permit, where the default
   * is that they do NOT.
   *
   * 🛑 FAIL-CLOSED, and that direction is the whole point. Razorpay and
   * PhonePe both name *"Bidding/Auction houses"* in their prohibited-merchant
   * lists; Cashfree's published terms do not. The penalty for getting it wrong
   * is not a declined transaction — it is the merchant account frozen with the
   * settlement balance held, which takes down payments for EVERY listing type,
   * not just the offending one. So a gateway is assumed to prohibit a
   * restricted type until it says otherwise, and a new adapter that forgets to
   * declare this is safe by omission rather than dangerous by omission.
   *
   * 🛑 Declared HERE, on the provider, rather than tested by name at the gate.
   * `activeGateway === "cashfree"` would restate the compliance rule at every
   * call site and go quietly wrong the day a second permitted gateway is
   * added — the ten-hand-written-enumerations shape of Root Cause #61. The
   * gateway is the thing that knows what its contract allows, so it is the
   * thing that declares it.
   *
   * 🛑 This is NOT the same question as `supportsSplit` in the consumer's
   * gateway registry, and the two must not be collapsed. Razorpay Route splits
   * perfectly well AND prohibits auctions; Cashfree happens to do both. One is
   * a capability, the other is a permission.
   *
   * Empty for every provider that has not been checked against its terms.
   */
  readonly acceptsRestrictedListingTypes: readonly string[] = [];
  abstract createOrder(
    amount: number,
    currency: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<PaymentOrder>;
  /** Returns true if the webhook signature is valid. */
  abstract verifyWebhook(payload: string, signature: string): boolean;

  /**
   * Verify the BUYER-PRESENT checkout callback — a different exchange from a
   * webhook, which is why `verifyWebhook` cannot serve it.
   *
   * A webhook is server-to-server and signed over a raw body. This is the
   * redirect/callback the buyer's own browser hands back after paying
   * (Razorpay's `razorpay_order_id` + `razorpay_payment_id` +
   * `razorpay_signature`). Until this existed, generic checkout code imported
   * Razorpay's verifier directly — a concrete gateway named in the one place
   * that must work for every gateway.
   *
   * 🛑 MUST FAIL CLOSED. A gateway with no such handshake returns `false`, not
   * `true`: this call is what decides whether a payment is genuine, so the
   * default for "I cannot verify this" is rejection. Returning `true` would
   * accept a forged callback.
   *
   * 🛑 The SECRET stays the caller's to resolve, deliberately. The call site
   * already reads it from settings and fails closed when absent; moving that
   * inside would change which code holds the key and what happens when it is
   * missing, which is a bigger change than the dispatch this method is for.
   *
   * @param payload the gateway's callback fields, shape-checked by the provider
   * @param secret  the key secret, resolved by the caller
   */
  abstract verifyCheckoutSignature(
    payload: Record<string, string>,
    secret: string,
  ): boolean;
  abstract capturePayment(orderId: string): Promise<PaymentCapture>;
  abstract refund(paymentId: string, amount?: number): Promise<Refund>;
  abstract getOrder(orderId: string): Promise<PaymentOrder>;

  /*
   * ── DISPUTES ──────────────────────────────────────────────────────────────
   *
   * Added as abstract members deliberately: `IPaymentProvider` is an abstract
   * CLASS, so this breaks every implementation at compile time and each one has
   * to state what it does about disputes. A set of optional methods would have
   * let a provider stay silent, and silence on a chargeback is the expensive
   * answer.
   */

  /**
   * Every payment the gateway recorded in a window — the reconciliation feed.
   *
   * 🛑 A provider that cannot enumerate payments returns `[]`, and the caller
   * MUST treat an empty list as "no information", never as "no payments".
   * Concluding "nothing is missing" from a provider that cannot answer is the
   * false-clean a reconciler exists to avoid.
   */
  abstract listPayments(opts: {
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<GatewayPaymentRecord[]>;

  /** Fetch one dispute by the gateway's id. */
  abstract getDispute(disputeId: string): Promise<Dispute>;

  /**
   * Every dispute the gateway knows about.
   *
   * 🛑 A gateway with no dispute concept returns `[]`, and that is the CORRECT
   * documented answer rather than a silent degrade: "this provider cannot have
   * chargebacks" is a true statement about manual bank transfers, not a
   * swallowed failure. `audit-silent-degrade` draws that line, and the
   * difference is that an empty array here is a fact while a `.catch(() => [])`
   * would be a guess.
   */
  abstract listDisputes(): Promise<Dispute[]>;

  /**
   * Accept liability. **Irreversible** — the gateway debits us and the dispute
   * is closed in the buyer's favour.
   *
   * `confirmIrrevocable` is a required literal `true`, so the call cannot be
   * made by a caller who has not read what it does; a boolean parameter that
   * could be `false` would be a flag, and this is a gate.
   */
  abstract acceptDispute(disputeId: string, confirmIrrevocable: true): Promise<Dispute>;

  /*
   * 🛑 THERE IS NO `contestDispute` AND NO `submitEvidence`, AND THAT ABSENCE
   * IS THE RULE — not an unimplemented stub.
   *
   * The Razorpay SDK has `disputes.contest(id, { shipping_proof, billing_proof,
   * explanation_letter, … })`, verified present in the installed 2.9.8. We
   * deliberately do not expose it.
   *
   * Submitting evidence is irreversible, it is judged by a third party, and it
   * is the one decision a human must make while looking at the actual
   * documents. Putting it on this contract would make it callable from a
   * route, and from there from a bulk action.
   *
   * The correct surface is Razorpay's own dashboard. Reinforced three ways:
   * nothing on this contract can call it, `acceptDispute` demands an explicit
   * confirmation, and the ingest handler is READS ONLY. A later session wanting
   * to "finish the dispute feature" should read this paragraph first — the
   * feature is finished; this is the shape.
   */
}

/**
 * One online gateway an admin has switched on, paired with the capability the
 * per-cart resolver needs and the adapter cannot state.
 *
 * ## Why the registry grew a LIST beside its single `payment`
 *
 * `payment` is resolved ONCE per process from the site-settings flags, and
 * that is correct for almost everything — a refund, a reconciliation sweep and
 * a webhook all talk to whichever gateway is live. It cannot express "this
 * cart needs a splitting gateway and that one doesn't", because the cart does
 * not exist at module load. So the per-cart resolver needs every ENABLED
 * gateway, not just the one that won the tie-break; with only the winner
 * visible, an admin who had enabled both PhonePe and Cashfree would see every
 * multi-vendor cart refused, because PhonePe sorts first.
 *
 * `payment` keeps its meaning and every existing caller keeps its behaviour.
 * This is additive and optional.
 *
 * 🛑 `supportsSplit` lives HERE and not on `IPaymentProvider`, and that
 * division is deliberate — see `acceptsRestrictedListingTypes`' own 🛑. Whether
 * split settlement is available is a fact about the PRODUCT the business
 * bought (Easy Split is a separately-onboarded Cashfree product, not an
 * inherent property of the Cashfree API), so the consumer's own gateway
 * registry is what knows it. Whether a listing type is permitted is a fact
 * about the adapter's merchant TERMS, so the provider declares that. Razorpay
 * Route splits perfectly well and prohibits auctions; collapsing the two
 * fields would make one of those two gateways unrepresentable.
 */
export interface RegisteredPaymentGateway {
  /** The adapter itself — this is what actually creates the order. */
  provider: IPaymentProvider;
  /**
   * Can this gateway split ONE capture across several vendors, so the platform
   * never holds the vendor's share?
   *
   * 🛑 `false` is the safe answer and must stay the default for anything not
   * explicitly known to split. A wrong `true` collects a vendor's money into
   * the platform's own account, which is the RBI commingling this field exists
   * to prevent, and it presents as a completely successful checkout.
   */
  supportsSplit: boolean;
  /**
   * Tie-break when several gateways qualify for the same cart. Lower wins,
   * matching the consumer registry's own `order`.
   */
  order: number;
}
