/**
 * Turn a `payment.dispute.*` webhook into a case with the gateway's own clock
 * on it.
 *
 * ## Why a dispute is the sharpest case kind
 *
 * Every other case in this collection has a deadline we invented or no deadline
 * at all. A dispute has `respond_by`, set by the gateway, and **missing it loses
 * the money by default** — irrespective of whether we were right. That single
 * property is why `paymentCases` exists as its own queue rather than as rows in
 * `serverErrors`: an error log is read when someone is curious, and this needs
 * to be read before a date.
 *
 * ## 🛑 THIS HANDLER IS READS ONLY
 *
 * It fetches, it records, it notifies. It never contests, never submits
 * evidence, never accepts liability. `IPaymentProvider` deliberately has no
 * `contestDispute` (see the 🛑 on that contract), and `acceptDispute` requires
 * an explicit irrevocability confirmation plus an admin uid — so neither is
 * reachable from here even by accident.
 *
 * Submitting evidence is irreversible and is judged by a third party looking at
 * documents. That decision belongs to a human in Razorpay's own dashboard. A
 * later session wanting to "complete the dispute feature" should read this
 * paragraph: the feature is complete, and this is the shape.
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { paiseToRupees, rupeesToPaise } from "../../../../core/money";
import type { Dispute } from "../../../../contracts/payment";
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";

/**
 * Dispute statuses, as Razorpay spells them.
 *
 * 🛑 NOT a TypeScript union on `Dispute.status` — the SDK declares that field
 * as `string` and the value set is the gateway's to change. These constants are
 * for COMPARISON, and every comparison below treats an unrecognised value as
 * "still open", which fails in the safe direction: an unknown state leaves the
 * case needing attention rather than silently closing it.
 */
const DISPUTE_CLOSED_STATUSES = new Set(["won", "lost", "closed"]);

/**
 * Which `payment.dispute.*` events exist.
 *
 * 🛑 TRAINING-SOURCED NAMES, NOT VERIFIED. The plan's capability matrix marks
 * these `TRAINING` and says to read the live dashboard's event picker before
 * trusting them — and that has not happened, because it needs the dashboard.
 *
 * This is why the route matches on the **`payment.dispute.` PREFIX** rather
 * than on an exact list: a dispute event whose name we guessed wrong still
 * classifies as a dispute, still gets a case, and still carries its
 * `respond_by`. Guessing a name wrong then costs a slightly less precise title,
 * not a missed chargeback. `razorpay.webhooks.all()` enumerates the real
 * subscription set for free whenever someone has credentials to hand.
 */
export const DISPUTE_EVENT_PREFIX = "payment.dispute.";

export interface DisputeWebhookEntity {
  id?: string;
  payment_id?: string;
  amount?: number;
  currency?: string;
  amount_deducted?: number;
  reason_code?: string;
  respond_by?: number;
  status?: string;
  phase?: string;
  created_at?: number;
}

/**
 * Severity from the dispute's own state.
 *
 * Always at least `warning`, and `error` while a response is still owed —
 * because that is the window in which a human can still change the outcome.
 * A closed dispute drops to `warning`: it still needs handling (a lost dispute
 * means a payout clawback and an order-status decision) but no longer has a
 * clock.
 *
 * 🛑 `openOrObserve` only ever escalates, so a `won`/`lost` event arriving
 * after the `created` one will NOT downgrade the case from `error`. That is
 * deliberate and is the correct direction: the operator was told this was
 * urgent, and the fact that the window closed does not make the consequence
 * smaller.
 */
function severityFor(status: string | undefined): "warning" | "error" {
  return status && DISPUTE_CLOSED_STATUSES.has(status) ? "warning" : "error";
}

/**
 * Record a dispute as a case.
 *
 * Returns the case id, or `null` when the payload carried no usable dispute —
 * in which case the caller still has a `gatewayEvents` row with the verbatim
 * body, so nothing is lost.
 */
export async function ingestDispute(
  entity: DisputeWebhookEntity,
  opts: { gateway: string; gatewayEventId?: string; rawEvent: string },
): Promise<string | null> {
  const disputeId = entity.id;
  const paymentId = entity.payment_id;

  if (!disputeId || !paymentId) {
    serverLogger.error("dispute ingest: payload carried no dispute id or payment id", {
      rawEvent: opts.rawEvent,
    });
    return null;
  }

  /*
   * 🛑 Two conversions, both silent when wrong, and they fail differently.
   *
   *   amount / amount_deducted — currency SUBUNITS → rupees, via the shared
   *     helper. Hand-writing `/ 100` here would be blocked by
   *     `audit-money-units`, and rightly: six money fields survived the 2026-05
   *     migration with the wrong unit precisely because the arithmetic was
   *     scattered rather than named.
   *
   *   respond_by — Unix SECONDS → Date, so `* 1000`. Getting this wrong yields
   *     21 January 1970, which does not throw and does not read as a unit bug —
   *     it reads as corrupt data, and it would make a live deadline sort as
   *     decades overdue, so an escalation query would either flood on it or
   *     ignore it. There is no helper for this one because it is a timestamp,
   *     not money.
   */
  const amount = typeof entity.amount === "number" ? paiseToRupees(entity.amount) : undefined;
  const amountDeducted =
    typeof entity.amount_deducted === "number"
      ? paiseToRupees(entity.amount_deducted)
      : undefined;
  const respondBy =
    typeof entity.respond_by === "number" ? new Date(entity.respond_by * 1000) : undefined;

  /*
   * Which of OUR orders this dispute concerns. Best-effort: a dispute on a
   * payment we cannot find is MORE urgent, not less — it means either our
   * records are wrong or somebody is disputing a payment we never recorded —
   * so a failed lookup must not stop the case being opened.
   */
  let orderIds: string[] = [];
  try {
    const orders = await orderRepository.findByPaymentId(paymentId);
    orderIds = orders.map((o) => o.id);
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("dispute ingest: order lookup failed — opening the case regardless", {
      paymentId,
    });
  }

  const status = entity.status ?? "unknown";
  const detailLines = [
    `Gateway: ${opts.gateway}`,
    `Event: ${opts.rawEvent}`,
    `Dispute: ${disputeId}`,
    `Payment: ${paymentId}`,
    `Status: ${status}${entity.phase ? ` (phase ${entity.phase})` : ""}`,
    entity.reason_code ? `Reason code: ${entity.reason_code}` : null,
    amount !== undefined ? `Amount disputed: ${amount}` : null,
    amountDeducted !== undefined && amountDeducted > 0
      ? `Already deducted from our balance: ${amountDeducted}`
      : null,
    respondBy ? `Respond by: ${respondBy.toISOString()}` : "Respond by: not supplied",
    orderIds.length
      ? `Our orders: ${orderIds.join(", ")}`
      : "🛑 No order found for this payment — records disagree with the gateway",
    "",
    "Respond in the gateway's own dashboard. This system does not submit evidence.",
  ].filter((line): line is string => line !== null);

  const result = await paymentCasesRepository().openOrObserve({
    kind: "dispute",
    /*
     * Keyed on the DISPUTE id, so every event in one dispute's lifecycle —
     * created, under_review, won/lost, closed — lands on ONE case rather than
     * four. That is the whole mechanism; keying on the event id would produce a
     * case per notification.
     */
    subjectId: disputeId,
    severity: severityFor(entity.status),
    title: `Chargeback ${status} — ${disputeId}`,
    detail: detailLines.join("\n"),
    entityType: orderIds.length > 0 ? "order" : "payment",
    entityId: orderIds[0] ?? paymentId,
    ...(respondBy ? { dueAt: respondBy } : {}),
    ...(amount !== undefined ? { amountAtRisk: amount } : {}),
    ...(opts.gatewayEventId ? { gatewayEventIds: [opts.gatewayEventId] } : {}),
    ...(orderIds.length ? { orderIds } : {}),
    gatewayPaymentId: paymentId,
  });

  /*
   * 🛑 A closed dispute MARKS SELF-HEALED AND STAYS OPEN.
   *
   * "Razorpay closed the dispute" and "we have finished handling it" are
   * different facts, and the gap between them is work: a LOST dispute needs a
   * payout clawback from the seller and a decision about the order's status,
   * and a WON one still needs the order un-flagged. Auto-closing on the
   * gateway's say-so would file both as done.
   */
  if (entity.status && DISPUTE_CLOSED_STATUSES.has(entity.status)) {
    await paymentCasesRepository().markSelfHealed(result.id);
    serverLogger.info("dispute ingest: gateway closed the dispute — case left open for a human", {
      disputeId,
      status: entity.status,
      caseId: result.id,
    });
  }

  serverLogger.warn("dispute ingest: case recorded", {
    disputeId,
    paymentId,
    caseId: result.id,
    created: result.created,
    dueAt: respondBy?.toISOString(),
  });

  return result.id;
}

/**
 * Poll the gateway for every dispute it knows about and reconcile them into
 * cases. Phase 4's R4 calls this; it is idempotent by construction, since
 * `openOrObserve` is.
 *
 * Takes the already-normalised `Dispute[]` from the provider adapter, which has
 * done the unit conversions — so this function performs none, and there is one
 * place per direction that does.
 */
export async function reconcileDisputes(disputes: readonly Dispute[]): Promise<number> {
  let recorded = 0;
  for (const d of disputes) {
    try {
      await ingestDispute(
        {
          id: d.id,
          payment_id: d.paymentId,
          /*
           * Converted BACK to subunits, because `ingestDispute` takes a
           * WEBHOOK-shaped entity (subunits) while `Dispute` is already in
           * rupees. One input contract rather than two — the alternative is an
           * "already converted" boolean, which is exactly the kind of flag that
           * ends up wrong at one of two call sites.
           *
           * Via `rupeesToPaise`, not `* 100`: the round-trip must use the same
           * rounding as the forward conversion, or a ₹1,499.50 dispute comes
           * back a paisa light and the `amountAtRisk` on the case disagrees
           * with the gateway by a rounding error nobody can explain.
           */
          amount: rupeesToPaise(d.amount),
          currency: d.currency,
          amount_deducted: rupeesToPaise(d.amountDeducted),
          reason_code: d.reasonCode,
          respond_by: Math.floor(d.respondBy.getTime() / 1000),
          status: d.status,
          phase: d.phase,
          created_at: Math.floor(d.createdAt.getTime() / 1000),
        },
        { gateway: d.gateway, rawEvent: "reconcile.disputes.all" },
      );
      recorded += 1;
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("dispute reconcile: one dispute failed — continuing", {
        disputeId: d.id,
      });
    }
  }
  return recorded;
}
