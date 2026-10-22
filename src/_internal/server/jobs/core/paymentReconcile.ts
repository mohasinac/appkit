/**
 * Payment reconciliation — R1 through R4.
 *
 * ## What this is for
 *
 * Every other check in this system starts from OUR records and asks whether
 * they are internally consistent. R2 starts from the **gateway's** records and
 * asks whether we have an order at all — and that is the only direction that
 * could have detected the 2026-10-21 incident, where our side had nothing to be
 * inconsistent with. ₹2,511.80 was captured, no order existed, and the first
 * signal was the buyer asking where their order was. **Had R2 existed it would
 * have been a case on a dashboard within a day.**
 *
 * ## Cost, honestly
 *
 * One new Cloud Scheduler job (`paymentReconcile`, daily 05:30 UTC). Scheduler
 * bills **per registered job** — 3 free, 28 already registered — so this is
 * ~$0.10/month. It is NOT folded into `countersReconcile`, which already runs
 * at its 540 s ceiling, nor into `autoPayoutEligibility`: `priceIndexRollup`'s
 * own comment sets the precedent that a job should be able to fail without
 * taking an unrelated one down with it.
 *
 * R1 is different and is folded into the existing `paymentWindowTimeout`
 * (every 5 minutes) for free, because a stuck event needs a tight loop and the
 * query is one indexed read.
 *
 * Reads per daily run, pre-launch: well under 50 against a 50,000/day free
 * quota. **The count is logged on every run** — the same discipline
 * `searchIndexBuild` uses — so a regression to always-full is visible before it
 * is a quota wall. Root Cause #92 and the 2026-10-09 HTTP 402 are both what
 * happens when nobody logs the number.
 */

import { getProviders } from "../../../../contracts/registry";
import { normalizeError } from "../../../../errors/normalize";
import { gatewayEventsRepository } from "../../../../features/gateway-events/repository/gateway-events.repository";
import {
  GATEWAY_EVENT_MAX_ATTEMPTS,
  type GatewayEventDocument,
} from "../../../../features/gateway-events/schemas/firestore";
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import {
  REFUND_CLAIMS_COLLECTION,
  REFUND_CLAIM_FIELDS,
  ORDER_COLLECTION,
  type OrderDocument,
} from "../../../../features/orders/schemas/firestore";
import type { GatewayPaymentRecord } from "../../../../contracts/payment";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import { reconcileDisputes } from "../../features/payment-cases/disputes";
import {
  refundableBase,
  committedRefundTotal,
  MONEY_EPSILON,
} from "../../../shared/checkout/refundable-base";
import type { JobContext } from "../runtime/types";

/** How far back R2 looks. Two days of overlap, so a run that fails is covered by the next. */
const PAYMENT_WINDOW_HOURS = 48;

/** A refund claim unsettled for longer than this is a crash between call and record. */
const STALE_CLAIM_HOURS = 1;

/** Escalate a case this close to its external deadline. */
const DUE_SOON_HOURS = 72;

/*
 * Money comparisons use the half-paisa epsilon the refund cap already defines.
 *
 * 🛑 IMPORTED, not redeclared. I wrote a second `const MONEY_EPSILON = 0.005`
 * here first, which is Root Cause #75's exact shape — the same constant in two
 * files, drifting the day one of them is tuned. Two independent epsilons would
 * mean the refund cap and the reconciler disagreeing about whether a refund was
 * complete, which is the worst possible place for them to disagree.
 *
 * Why an epsilon at all: `0.1 + 0.2 > 0.3` is TRUE in IEEE-754, so an exact
 * `!==` between two decimal-rupee sums manufactures mismatch cases out of float
 * noise — and a reconciler that cries wolf is one an operator learns to close
 * unread, which is worse than not having it.
 */

export interface PaymentReconcileResult {
  /** R1 */
  stuckEventsRedispatched: number;
  stuckEventsEscalated: number;
  /** R2 */
  paymentsExamined: number;
  missingOrders: number;
  amountMismatches: number;
  refundMismatches: number;
  /** R3 */
  staleClaims: number;
  /** R4 */
  disputesRecorded: number;
  casesEscalated: number;
  /** R5 */
  unpaidCancellations: number;
  staleRefundFlagsCleared: number;
  /** Observability */
  reads: number;
  skippedReason?: string;
}

/* ───────────────────────── R1: events we received and lost ───────────────── */

/**
 * Re-dispatch gateway events whose lease lapsed before they settled.
 *
 * 🛑 This catches "we received it and lost it" with a **5-minute** window
 * instead of never. Before the inbox existed there was no artefact at all; the
 * inbox alone makes the loss *visible*, and this is what makes it *recoverable*.
 *
 * Exported separately so `paymentWindowTimeout` can fold it in — a stuck
 * payment event should not wait for a daily job.
 *
 * 🛑 It does NOT re-run the placement itself. Re-dispatching from a job would
 * mean duplicating the webhook route's whole switch (and its RTDB signalling)
 * in a second place, which is Root Cause #75's shape on the dispatch axis.
 * Instead it RESETS the lease so the gateway's own redelivery — or an operator
 * replaying from the admin page in Phase 8 — is accepted rather than
 * short-circuited as a duplicate, and escalates to a case once the attempt
 * budget is spent. The gateway retries for hours; this just stops the inbox
 * from refusing the retry.
 */
export async function reconcileStuckGatewayEvents(
  ctx: JobContext,
): Promise<{ redispatched: number; escalated: number; reads: number }> {
  let redispatched = 0;
  let escalated = 0;

  let stuck: GatewayEventDocument[] = [];
  try {
    stuck = await gatewayEventsRepository().listStuck(ctx.now, 20);
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("R1: stuck-event query failed", { err });
    return { redispatched: 0, escalated: 0, reads: 0 };
  }

  for (const event of stuck) {
    try {
      if (event.attempts >= GATEWAY_EVENT_MAX_ATTEMPTS) {
        await paymentCasesRepository().openOrObserve({
          kind: "unprocessed_event",
          subjectId: event.id,
          severity: "error",
          title: `Webhook never processed after ${event.attempts} attempts — ${event.rawEvent}`,
          detail: [
            `Gateway: ${event.gateway}`,
            `Event: ${event.rawEvent} (${event.kind})`,
            `Attempts: ${event.attempts}`,
            event.gatewayOrderId ? `Gateway order: ${event.gatewayOrderId}` : null,
            event.gatewayPaymentId ? `Gateway payment: ${event.gatewayPaymentId}` : null,
            event.lastError ? `Last error: ${event.lastError}` : null,
            "",
            "The event body is preserved on the gatewayEvents row. If this is a",
            "`paid` event, a buyer may have been charged with no order.",
          ]
            .filter((l): l is string => l !== null)
            .join("\n"),
          entityType: "event",
          entityId: event.id,
          ...(typeof event.amount === "number" ? { amountAtRisk: event.amount } : {}),
          gatewayEventIds: [event.id],
          ...(event.gatewayPaymentId ? { gatewayPaymentId: event.gatewayPaymentId } : {}),
          now: ctx.now,
        });
        /*
         * Settled `failed` + `terminal` so it leaves the stuck query. Without
         * this the same row is re-examined every 5 minutes forever — which
         * `openOrObserve` would dedupe into one case, but at the cost of a
         * pointless read and write every tick for the life of the collection.
         */
        await gatewayEventsRepository().settle(event.id, {
          status: "failed",
          terminal: true,
          lastError: `attempt budget exhausted (${event.attempts})`,
          now: ctx.now,
        });
        escalated += 1;
        continue;
      }

      await gatewayEventsRepository().renewLease(event.id, event.attempts, ctx.now);
      redispatched += 1;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("R1: could not handle a stuck event — continuing", { id: event.id });
    }
  }

  if (stuck.length > 0) {
    ctx.logger.warn("R1: stuck gateway events found", {
      found: stuck.length,
      redispatched,
      escalated,
    });
  }
  return { redispatched, escalated, reads: stuck.length };
}

/* ──────────────── R2: the gateway has it — do we? ───────────────────────── */

async function reconcileGatewayPayments(
  ctx: JobContext,
): Promise<{
  examined: number;
  missing: number;
  amountMismatch: number;
  refundMismatch: number;
  reads: number;
}> {
  const payment = getProviders().payment;
  let examined = 0;
  let missing = 0;
  let amountMismatch = 0;
  let refundMismatch = 0;
  let reads = 0;

  if (!payment) {
    ctx.logger.warn("R2: no payment provider registered — cannot reconcile");
    return { examined, missing, amountMismatch, refundMismatch, reads };
  }

  const from = new Date(ctx.now.getTime() - PAYMENT_WINDOW_HOURS * 3_600_000);
  let records;
  try {
    records = await payment.listPayments({ from, to: ctx.now, limit: 100 });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("R2: gateway payment listing failed", { err });
    return { examined, missing, amountMismatch, refundMismatch, reads };
  }

  /*
   * 🛑 An empty list means "NO INFORMATION" on the manual and PhonePe
   * providers, which cannot enumerate payments at all — and concluding "nothing
   * is missing" from a provider that cannot answer is the false-clean this
   * whole job exists to avoid. So nothing is inferred from emptiness; the run
   * simply records that it learned nothing.
   */
  if (records.length === 0) {
    ctx.logger.info("R2: provider returned no payments — no conclusion drawn", {
      gateway: payment.name,
    });
    return { examined, missing, amountMismatch, refundMismatch, reads };
  }

  for (const record of records) {
    /*
     * Only CAPTURED payments. An `authorized`-but-uncaptured or `failed`
     * payment having no order is correct, not a defect — and opening a case for
     * every declined card would bury the real findings. Anything unrecognised
     * is treated as not-captured, which fails toward silence.
     */
    if (record.status !== "captured" && record.status !== "refunded") continue;
    examined += 1;

    try {
      /*
       * Keyed on the gateway ORDER id, because that is what this codebase
       * stores as `order.paymentId` — see the Razorpay provider's own class
       * comment about keying every lookup on one id. Falls back to the payment
       * id for gateways where they coincide.
       */
      const lookupId = record.orderId ?? record.id;
      const orders = await orderRepository.findByPaymentId(lookupId);
      reads += 1;

      if (orders.length === 0) {
        missing += 1;
        await paymentCasesRepository().openOrObserve({
          kind: "missing_order",
          subjectId: record.id,
          severity: "error",
          title: `Captured payment with no order — ${record.id}`,
          detail: [
            `🛑 The gateway says this payment was captured and we have no order for it.`,
            `This is the 2026-10-21 shape: the buyer has been charged.`,
            "",
            `Gateway: ${record.gateway}`,
            `Payment: ${record.id}`,
            record.orderId ? `Gateway order: ${record.orderId}` : null,
            `Amount: ${record.amount} ${record.currency}`,
            record.capturedAt ? `Captured: ${record.capturedAt.toISOString()}` : null,
            "",
            `Check gatewayEvents for ${record.orderId ?? record.id} to see what the`,
            `webhook did, and gatewayOrderClaims for a claim that was never released.`,
          ]
            .filter((l): l is string => l !== null)
            .join("\n"),
          entityType: "payment",
          entityId: record.id,
          amountAtRisk: record.amount,
          gatewayPaymentId: record.id,
          now: ctx.now,
        });
        continue;
      }

      for (const order of orders) {
        const outcome = await reconcilePaymentAgainstOrder(record, order, ctx);
        amountMismatch += outcome.amountMismatch;
        refundMismatch += outcome.refundMismatch;
      }
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("R2: one payment failed to reconcile — continuing", {
        paymentId: record.id,
      });
    }
  }

  return { examined, missing, amountMismatch, refundMismatch, reads };
}


/**
 * The two per-order checks R2 runs against one gateway record.
 *
 * Extracted so each `openOrObserve` call is a statement in a function body
 * rather than five braces deep inside `for record -> try -> for order -> if`.
 * Returns the counts rather than mutating the caller's accumulators, so the
 * loop above reads as a sum rather than as two side effects.
 */
async function reconcilePaymentAgainstOrder(
  record: GatewayPaymentRecord,
  order: OrderDocument,
  ctx: JobContext,
): Promise<{ amountMismatch: number; refundMismatch: number }> {
  let amountMismatch = 0;
  let refundMismatch = 0;
      /*
       * Amount check. Compared against the order's own recorded total rather
       * than recomputed from its lines — recomputing would re-derive the
       * pricing pipeline here and disagree with it the day a rate changes,
       * which is a sixth copy of the money rule (Root Cause #75).
       */
      const recorded = order.totalPrice ?? 0;
      if (Math.abs(recorded - record.amount) > MONEY_EPSILON) {
        amountMismatch += 1;
        await paymentCasesRepository().openOrObserve({
          kind: "amount_mismatch",
          subjectId: `${record.id}:${order.id}`,
          severity: "error",
          title: `Captured ${record.amount} but recorded ${recorded} — ${order.id}`,
          detail: [
            `The gateway captured a different amount from the one the order records.`,
            `Either the buyer was over-charged or the order under-states what was paid.`,
            "",
            `Gateway: ${record.gateway}`,
            `Payment: ${record.id}`,
            `Order: ${order.id}`,
            `Captured: ${record.amount} ${record.currency}`,
            `Order total: ${recorded}`,
            `Difference: ${(record.amount - recorded).toFixed(2)}`,
          ].join("\n"),
          entityType: "order",
          entityId: order.id,
          amountAtRisk: Math.abs(record.amount - recorded),
          orderIds: [order.id],
          gatewayPaymentId: record.id,
          now: ctx.now,
        });
      }

      /*
       * Refund check — the gateway's `amount_refunded` against our own
       * non-failed refund events. `committedRefundTotal` is the same helper
       * the refund cap uses, so "what we think we refunded" has ONE
       * definition rather than a second one written here.
       */
      const ours = committedRefundTotal(order);
      if (Math.abs(ours - record.amountRefunded) > MONEY_EPSILON) {
        refundMismatch += 1;
        await paymentCasesRepository().openOrObserve({
          kind: "refund_mismatch",
          subjectId: `${record.id}:refunds`,
          severity: record.amountRefunded > ours ? "error" : "warning",
          title: `Refund total disagrees with the gateway — ${order.id}`,
          detail: [
            record.amountRefunded > ours
              ? `🛑 The gateway has refunded MORE than our records show. Money has left that we did not record.`
              : `Our records show more refunded than the gateway did — a refund may have been reserved and never completed.`,
            "",
            `Gateway: ${record.gateway}`,
            `Payment: ${record.id}`,
            `Order: ${order.id}`,
            `Gateway refunded: ${record.amountRefunded}`,
            `Our committed refunds: ${ours}`,
            `Refundable base: ${refundableBase(order)}`,
            record.refundStatus ? `Gateway refund status: ${record.refundStatus}` : null,
          ]
            .filter((l): l is string => l !== null)
            .join("\n"),
          entityType: "order",
          entityId: order.id,
          amountAtRisk: Math.abs(record.amountRefunded - ours),
          orderIds: [order.id],
          gatewayPaymentId: record.id,
          now: ctx.now,
        });
      }
  return { amountMismatch, refundMismatch };
}
/* ──────────────── R3: refund claimed, never settled ─────────────────────── */

/**
 * A `refundClaims` row still `claimed` an hour later is a crash between
 * "provider called" and "entry settled".
 *
 * 🛑 It is NOT resolved by guessing. The money may have left; the only
 * authoritative answer is the gateway's, which a human reads. So this opens a
 * case and stops — a sweep that decided for itself whether a refund had
 * happened would be the double-refund generator the idempotency claim exists
 * to prevent.
 */
async function reconcileStaleRefundClaims(
  ctx: JobContext,
): Promise<{ stale: number; reads: number }> {
  const cutoff = new Date(ctx.now.getTime() - STALE_CLAIM_HOURS * 3_600_000);
  let stale = 0;

  try {
    const snap = await ctx.db
      .collection(REFUND_CLAIMS_COLLECTION)
      .where(REFUND_CLAIM_FIELDS.STATE, "==", "claimed")
      .where(REFUND_CLAIM_FIELDS.CLAIMED_AT, "<", cutoff)
      .limit(50)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as {
        orderId?: string;
        amount?: number;
        claimedBy?: string;
      };
      stale += 1;
      await paymentCasesRepository().openOrObserve({
        kind: "refund_mismatch",
        subjectId: `claim:${doc.id}`,
        severity: "error",
        title: `Refund claimed but never settled — ${doc.id}`,
        detail: [
          `A refund was claimed over ${STALE_CLAIM_HOURS}h ago and never recorded an outcome.`,
          `That is a crash between calling the gateway and writing the result, so`,
          `🛑 THE MONEY MAY HAVE LEFT. Read the gateway's refund list for this`,
          `payment — do not assume either way, and do not retry the refund.`,
          "",
          `Claim: ${doc.id}`,
          data.orderId ? `Order: ${data.orderId}` : null,
          typeof data.amount === "number" ? `Amount: ${data.amount}` : null,
          data.claimedBy ? `Claimed by: ${data.claimedBy}` : null,
        ]
          .filter((l): l is string => l !== null)
          .join("\n"),
        entityType: "refund",
        entityId: doc.id,
        ...(typeof data.amount === "number" ? { amountAtRisk: data.amount } : {}),
        ...(data.orderId ? { orderIds: [data.orderId] } : {}),
        now: ctx.now,
      });
    }
    return { stale, reads: snap.size };
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("R3: stale-claim query failed", { err });
    return { stale, reads: 0 };
  }
}

/* ──────────────── R5: a cancellation that still owes money ──────────────── */

/**
 * A cancelled order whose recorded refund was never actually paid.
 *
 * ## 🛑 Why R3 cannot see this, which is the whole reason R5 exists
 *
 * R3 above watches `refundClaims` for a row stuck in `claimed` — i.e. a crash
 * **after** `processRefundAction` took its idempotency claim. But
 * `cancelOrderWithRefund` writes the cancellation and the refund *intent*
 * first, and only then calls `processRefundAction`. So a failure in that window
 * — the process dies, the settings read throws, the provider is unreachable
 * before a claim is written — leaves **no `refundClaims` row at all**, and R3
 * is structurally blind to it.
 *
 * What it does leave is an order that says, in its own fields, that it owes
 * money: `status: "cancelled"` with a `refundAmount` and
 * `refundStatus: "pending"`. That is the artefact, and it exists precisely
 * because the intent is written before the money moves.
 *
 * ## Two equalities, no inequality, and the reason
 *
 * `where(status).where(refundStatus)` plus a `limit`. Deliberately **no
 * `orderBy`**: `cancellationDate` and `refundAmount` are both optional fields,
 * and an `orderBy` on an optional field silently excludes every document that
 * lacks it (Root Cause #100) — which here would mean the sweep quietly skipping
 * exactly the malformed rows it is looking for. With no `orderBy` Firestore
 * orders by document id, which is stable and needs no second index.
 *
 * ## The settled check reads `refunds[]`, not the flag
 *
 * The flag says what was INTENDED; `refunds[]` says what HAPPENED, and it is
 * maintained transactionally by reserve/settle. `settleRefund` now clears the
 * flag to `"completed"` on a full processed refund, so a healthy refund leaves
 * this query's result set on its own — but a crash between the provider call
 * and that write would leave the flag standing with the money gone. Comparing
 * against the committed total is what tells those two apart, and getting it
 * backwards would report every successful refund as a failure.
 */
async function reconcileUnpaidCancellations(
  ctx: JobContext,
): Promise<{ owed: number; stale: number; reads: number }> {
  let owed = 0;
  let stale = 0;

  try {
    const snap = await ctx.db
      .collection(ORDER_COLLECTION)
      .where(ORDER_FIELDS.STATUS, "==", "cancelled")
      .where(ORDER_FIELDS.REFUND_STATUS, "==", "pending")
      .limit(100)
      .get();

    /*
     * Saturation is reported, never silent. A full page means there may be more
     * behind it, and "we processed 100 and said nothing" reads identically to
     * "there were exactly 100" — the `truncated` discipline.
     */
    if (snap.size === 100) {
      ctx.logger.warn(
        "R5: hit the 100-order page limit — more unpaid cancellations may exist behind it",
      );
    }

    for (const doc of snap.docs) {
      const data = doc.data() as {
        refundAmount?: number;
        refunds?: Array<{ amount?: number; status?: string }>;
        paymentMethod?: string;
        paymentId?: string;
        userId?: string;
        storeId?: string;
        cancellationReason?: string;
      };

      const intended = data.refundAmount ?? 0;
      if (intended <= MONEY_EPSILON) {
        /*
         * `refundStatus: "pending"` with no amount. `cancelOrder` only writes
         * the flag together with an amount, so this is a legacy row or a
         * hand-edit — not money at risk, and not worth a case.
         */
        continue;
      }

      const committed = (data.refunds ?? [])
        .filter((r) => r.status !== "failed")
        .reduce((sum, r) => sum + (r.amount ?? 0), 0);

      if (committed >= intended - MONEY_EPSILON) {
        /*
         * The money DID move; only the flag is stale — a crash between the
         * provider call and `settleRefund`'s write, or a refund settled through
         * a path that predates the flag being cleared. Repaired in place rather
         * than escalated: there is nothing for a human to decide, and leaving
         * it would make this order reappear in every future run.
         */
        stale += 1;
        await doc.ref
          .update({ refundStatus: "completed", updatedAt: ctx.now })
          .catch((err: unknown) => {
            void normalizeError(err);
            ctx.logger.warn("R5: could not clear a stale refundStatus", { orderId: doc.id });
          });
        continue;
      }

      owed += 1;
      const shortfall = intended - committed;
      await paymentCasesRepository().openOrObserve({
        /*
         * The SAME kind and the SAME `subjectId` that `cancelOrderWithRefund`
         * uses when it opens this case synchronously — so when the failure was
         * caught at the time, this run increments `observedCount` instead of
         * opening a second case. That turns the count into "this has been owed
         * for N days", which is the number an operator should be triaging by.
         */
        kind: "manual_refund_due",
        subjectId: doc.id,
        severity: "error",
        title: `Cancelled order still owes ₹${shortfall.toFixed(2)} — ${doc.id}`,
        detail: [
          "This order is cancelled and records a refund it has not paid.",
          "",
          "🛑 R3 cannot see this case: it watches `refundClaims`, and a failure",
          "BEFORE a claim was taken leaves no claim row. The evidence is on the",
          "order itself — a recorded `refundAmount` that `refunds[]` does not",
          "cover.",
          "",
          `Order: ${doc.id}`,
          `Recorded as owed: ₹${intended.toFixed(2)}`,
          `Actually refunded: ₹${committed.toFixed(2)}`,
          `Shortfall: ₹${shortfall.toFixed(2)}`,
          data.paymentMethod ? `Payment method: ${data.paymentMethod}` : null,
          data.paymentId ? `Gateway reference: ${data.paymentId}` : null,
          data.userId ? `Buyer: ${data.userId}` : null,
          data.cancellationReason ? `Cancelled because: ${data.cancellationReason}` : null,
          "",
          "Refunding from the admin order page is idempotent on this order, so a",
          "retry cannot double-refund — if an earlier attempt did reach the",
          "gateway, the retry returns that same refund.",
        ]
          .filter((l): l is string => l !== null)
          .join("\n"),
        entityType: "order",
        entityId: doc.id,
        amountAtRisk: shortfall,
        orderIds: [doc.id],
        ...(data.paymentId ? { gatewayPaymentId: data.paymentId } : {}),
        now: ctx.now,
      });
    }

    return { owed, stale, reads: snap.size };
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("R5: unpaid-cancellation query failed", { err });
    return { owed, stale, reads: 0 };
  }
}

/* ──────────────── R4: disputes, and deadlines about to pass ─────────────── */

async function reconcileDisputesAndDeadlines(
  ctx: JobContext,
): Promise<{ recorded: number; escalated: number; reads: number }> {
  let recorded = 0;
  let escalated = 0;
  let reads = 0;

  const payment = getProviders().payment;
  if (payment) {
    try {
      const disputes = await payment.listDisputes();
      if (disputes.length > 0) recorded = await reconcileDisputes(disputes);
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("R4: dispute listing failed", { err });
    }
  }

  /*
   * Deadline escalation. `listDueBefore` can only see cases that HAVE a
   * `dueAt`, because a Firestore inequality excludes documents lacking the
   * field (Root Cause #100) — correct here, since a case with no deadline
   * cannot be nearly-overdue.
   *
   * Escalating to `error` is all this does. It does NOT send a notification per
   * run: `openOrObserve`'s severity-only escalation plus the daily digest's
   * "nearest external deadline" line is the alert, and a per-run email on a
   * case that stays open for its whole 7-day response window would be seven
   * emails against an 80/day budget for one fact.
   */
  try {
    const horizon = new Date(ctx.now.getTime() + DUE_SOON_HOURS * 3_600_000);
    const due = await paymentCasesRepository().listDueBefore(horizon, 50);
    reads += due.length;
    for (const kase of due) {
      if (kase.severity === "error") continue;
      await paymentCasesRepository().openOrObserve({
        kind: kase.kind,
        subjectId: kase.dedupeKey.slice(kase.kind.length + 1),
        severity: "error",
        title: kase.title,
        detail: kase.detail,
        entityType: kase.entityType,
        entityId: kase.entityId,
        ...(kase.dueAt ? { dueAt: kase.dueAt } : {}),
        ...(typeof kase.amountAtRisk === "number"
          ? { amountAtRisk: kase.amountAtRisk }
          : {}),
        now: ctx.now,
      });
      escalated += 1;
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("R4: deadline escalation failed", { err });
  }

  return { recorded, escalated, reads };
}

/* ─────────────────────────────── the job ────────────────────────────────── */

export async function runPaymentReconcile(ctx: JobContext): Promise<PaymentReconcileResult> {
  ctx.logger.info("Starting payment reconciliation (R2 + R3 + R4 + R5)");

  /*
   * 🛑 R1 is deliberately NOT called here. It belongs to
   * `paymentWindowTimeout`, which runs every 5 minutes — a stuck payment event
   * should not wait up to 24 hours. Running it in both places would double its
   * writes for no extra coverage.
   */
  const [payments, claims, disputes, cancellations] = await Promise.all([
    reconcileGatewayPayments(ctx),
    reconcileStaleRefundClaims(ctx),
    reconcileDisputesAndDeadlines(ctx),
    reconcileUnpaidCancellations(ctx),
  ]);

  const result: PaymentReconcileResult = {
    stuckEventsRedispatched: 0,
    stuckEventsEscalated: 0,
    paymentsExamined: payments.examined,
    missingOrders: payments.missing,
    amountMismatches: payments.amountMismatch,
    refundMismatches: payments.refundMismatch,
    staleClaims: claims.stale,
    disputesRecorded: disputes.recorded,
    casesEscalated: disputes.escalated,
    unpaidCancellations: cancellations.owed,
    staleRefundFlagsCleared: cancellations.stale,
    reads: payments.reads + claims.reads + disputes.reads + cancellations.reads,
  };

  /*
   * Logged on EVERY run, including a clean one. The read count is the early
   * warning for a regression to always-full scanning — which is exactly how
   * the 2026-10-09 suspension and Root Cause #92's 12M invocations both became
   * visible only on a billing page.
   */
  ctx.logger.info("Payment reconciliation complete", { ...result });

  if (result.missingOrders > 0) {
    ctx.logger.error("🛑 Captured payments with no order", { count: result.missingOrders });
  }

  /*
   * Loud, for the same reason as the line above: a buyer whose cancelled order
   * never gave their money back has no way to tell, and nothing else in the
   * system complains. Separated from `staleRefundFlagsCleared`, which is
   * housekeeping and must not be reported in the same breath as money owed.
   */
  if (result.unpaidCancellations > 0) {
    ctx.logger.error("🛑 Cancelled orders still owing a refund", {
      count: result.unpaidCancellations,
    });
  }

  return result;
}
