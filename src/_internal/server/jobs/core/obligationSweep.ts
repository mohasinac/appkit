/**
 * `obligationSweep` — one job for every deadline in the order lifecycle.
 *
 * ## The shape, and why it is one query
 *
 * Open obligations past due, oldest first, bounded. For each: **re-read the
 * subject**, re-evaluate the policy's `precondition`, check `blockedBy`, then
 * either act or open a case.
 *
 * 🛑 THE RE-READ IS THE DESIGN. `obligations` is a due-date index, not truth.
 * A row saying "cancel this at 15:00" is a hint; the order saying "I was paid
 * at 14:58" is the fact, and the fact wins — the row closes `superseded` and
 * nothing happens. Without that step this collection would be a stored mirror
 * of derived state, which is Root Cause #42's shape and would eventually
 * cancel a paid order.
 *
 * ## Scheduler cost: it goes DOWN
 *
 * One new job at every 5 minutes. Three existing jobs —
 * `paymentWindowTimeout`, `pendingOrderTimeout` and `paymentReviewAutoApprove`
 * — are superseded by policy rows and are retired in Phase 8, so the registered
 * count goes **28 → 29 → 27** while roughly twenty scenarios gain coverage.
 * Scheduler bills per registered job, so that is a real saving, not a wash.
 *
 * One query per tick, empty when idle; about a dozen writes per order lifetime.
 */

import { normalizeError } from "../../../../errors/normalize";
import { obligationsRepository } from "../../../../features/obligations/repository/obligations.repository";
import { OBLIGATION_POLICIES } from "../../../../features/obligations/constants/policies";
import type { ObligationDocument } from "../../../../features/obligations/schemas/firestore";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import { cancelOrderWithRefund } from "../../features/orders/cancellation-refund";
import { processRefundAction } from "../../features/refunds/actions";
import { resolveRefundCapacity } from "../../features/refunds/capacity";
import { MONEY_EPSILON } from "../../../shared/checkout/refundable-base";
import type { JobContext } from "../runtime/types";

export interface ObligationSweepResult {
  due: number;
  acted: number;
  escalated: number;
  superseded: number;
  blocked: number;
  failed: number;
}

/**
 * Perform the policy's action.
 *
 * ## The narrowing is LIFTED, and what unblocked it
 *
 * This function used to write anchors and close windows and nothing else —
 * every monetary outcome escalated to a case **even where the policy said
 * `act`** — because the plan forbids an automatic refund until two things hold:
 *
 *  1. **Phase 1's idempotency and cumulative cap.** Landed in step 8:
 *     `idempotencyKey` is required, the cap is measured against
 *     `refundableBase` inside the reserving transaction, and the write is
 *     two-phase around the provider call. Without those, "a sweep on top of a
 *     non-idempotent refund that compares against `totalPrice` rather than the
 *     remaining balance is a double-refund generator" — the plan's words.
 *  2. **D14.** `cancelOrder` never received a `refundAmount` from any caller,
 *     so an automatic cancellation restocked and moved no money. Now closed:
 *     `cancelOrderWithRefund` owns cancel + restock + refund, keyed
 *     `cancel_{orderId}` so a sweep tick that re-fires cannot double-refund.
 *
 * Both hold, so the `act` tier does what its policies say.
 *
 * ## What still escalates, and it is not a leftover
 *
 * `return-receive` and `payout-release` are `onDue: "escalate"` in the registry
 * itself, which is the right place for that decision. And `return-inspect`
 * acts only on the half that is unconditional:
 *
 * 🛑 **Refunding the buyer is automatic; CHARGING THE SELLER is not.** The
 * plan's guardrail is explicit — "the buyer refund is automatic because the
 * cover is unconditional; the seller chargeback is not". So an uninspected
 * return refunds the buyer and opens a case for the seller-side decision,
 * rather than debiting a counterparty on a timer.
 */
async function performAction(
  ctx: JobContext,
  obligation: ObligationDocument,
  order: OrderDocument,
): Promise<"acted" | "escalated"> {
  const policy = OBLIGATION_POLICIES[obligation.kind];

  switch (obligation.kind) {
    /*
     * Writing an anchor is the safest possible action: it records a fact, moves
     * no money, and is what every post-delivery deadline depends on. Before
     * this, `deliveryDate` had NO writer anywhere in the live app (D26) — only
     * seed data and display components — so every post-delivery clock was
     * unanchored.
     */
    case "delivery-confirm":
      await orderRepository.updateStatus(order.id, "delivered", {
        deliveryDate: ctx.now,
      } as Partial<OrderDocument>);
      return "acted";

    /*
     * Closing a claim window moves no money either — it EARNS the premium we
     * already collected, which is what the payout hold has been waiting for.
     */
    case "claim-shipping":
    case "claim-sale":
      ctx.logger.info("obligation: protection claim window closed", {
        orderId: order.id,
        kind: obligation.kind,
      });
      return "acted";

    /*
     * ── ORDER COMPLETE: the dispute cutoff ────────────────────────────────
     *
     * Owner's rule: 7 days after delivery with no issue raised, the order is
     * complete, points are awarded, and no NEW dispute may be opened.
     *
     * Acting is safe and needs no money movement of its own: the obligation
     * closing IS the record that the window shut, and `payout-release` is
     * blocked on this kind, so the seller's funds become payable as a
     * consequence rather than by a second decision here.
     *
     * 🛑 THE POINTS AWARD IS NOT WRITTEN HERE YET, and that is deliberate
     * rather than forgotten. Phase P (step 16) owns the ledger, and the award
     * must be IDEMPOTENT because completion has two triggers — this sweep and
     * the buyer posting a review. `pointsLedger` is append-only, so an
     * un-keyed second append would be a permanent double credit with no way to
     * net it off. Writing the award before that key exists would be the
     * expensive half of the feature shipped first.
     *
     * The completion itself is recorded now, so when Phase P lands it has a
     * fact to award against rather than a window it has to re-derive.
     */
    case "order-complete":
      /*
       * Stamps the same FACT the buyer's fast path stamps, so both completion
       * routes converge on one field. `completedBy: "system"` is what
       * distinguishes the timer from the buyer — and it is the difference
       * between "nobody complained" and "the buyer said they were happy",
       * which are not the same signal even though they have the same effect.
       */
      await orderRepository.update(order.id, {
        completedAt: ctx.now,
        completedBy: "system",
      } as Partial<OrderDocument>);
      ctx.logger.info("obligation: dispute window closed — order complete", {
        orderId: order.id,
        deliveredAt: order.deliveryDate?.toISOString(),
      });
      return "acted";

    /*
     * ── CANCEL AND REFUND: the three pre-dispatch lapses ──────────────────
     *
     * All three share one mechanism because they share one outcome — the sale
     * is off and nothing has shipped — and their preconditions guarantee the
     * safe case: `seller-accept` and `seller-dispatch` both require
     * `!hasDispatched(o)`, and `proof-reupload` fires on an order whose payment
     * was never accepted at all.
     *
     * 🛑 `cancelOrderWithRefund` is the ONLY door, never `cancelOrder` plus a
     * refund call. It owns the restock (which four prior call sites each
     * forgot), the refund-intent write that makes a crash detectable, the
     * `cancel_{orderId}` idempotency key that makes a repeat tick a no-op, and
     * the post-dispatch and manual-payment branches that refuse to move money
     * automatically. Re-deriving any of that here would be a second copy of
     * the rule (Root Cause #75) in the one place that runs unattended.
     *
     * The outcome is LOGGED, not ignored: "cancelled and refunded ₹2,499" and
     * "cancelled, ₹2,499 still owed to a human" are different operational
     * facts, and the second one already has a case attached.
     */
    case "seller-accept":
    case "seller-dispatch":
    case "proof-reupload": {
      const { refund } = await cancelOrderWithRefund(order, {
        reason: policy.describe,
        /*
         * No `actorUid`. `HistoryActor.uid` is documented as absent for cron
         * jobs, and a literal `"system"` in a field that otherwise holds
         * Firebase uids would read as an account by that name in every
         * timeline.
         */
        actorRole: "system",
        trigger: `obligation:${obligation.kind}`,
      });
      ctx.logger.info("obligation: order cancelled on a lapsed deadline", {
        orderId: order.id,
        kind: obligation.kind,
        refundMoved: refund.moved,
        refundAmount: refund.amount,
      });
      return "acted";
    }

    /*
     * ── RETURN FLOW: two steps that move no money at all ──────────────────
     *
     * Both are `onDue: "act"` in the registry and both were escalating only
     * because the old narrowing was blanket rather than per-kind. Neither
     * touches a rupee.
     *
     * `return-respond`: the seller ignored the request, so it is approved on
     * their behalf. The status stays `return_requested` deliberately — the
     * buyer still has to post the parcel, and `returnApprovedAt` is what opens
     * their posting window. Writing it is also what stops the buyer's seven
     * days being silently eaten by a slow seller, which is why that anchor was
     * added in the first place.
     *
     * `return-post`: the buyer never posted, so the return closes and the
     * order goes back to `delivered` — its prior terminal state.
     * `return_requested → delivered` is in the transition map for exactly this,
     * and the map's own comment says why: without it a rejected or abandoned
     * return strands the order in limbo forever.
     */
    case "return-respond":
      await orderRepository.update(order.id, {
        returnApprovedAt: ctx.now,
      } as Partial<OrderDocument>);
      ctx.logger.info("obligation: return approved on the seller's behalf", {
        orderId: order.id,
      });
      return "acted";

    case "return-post":
      await orderRepository.updateStatus(order.id, "delivered", {
        updatedAt: ctx.now,
      } as Partial<OrderDocument>);
      ctx.logger.info("obligation: return window closed — buyer never posted", {
        orderId: order.id,
      });
      return "acted";

    /*
     * ── UNINSPECTED RETURN: refund the buyer, ASK about the seller ─────────
     *
     * 🛑 The asymmetry is the whole point, and it is the plan's own guardrail
     * verbatim: *"the buyer refund is automatic because the cover is
     * unconditional — the seller chargeback is not"*.
     *
     * Automatic for the buyer is defensible here specifically because the goods
     * are BACK WITH THE SELLER: `returnReceivedAt` is set, so this is not the
     * general "post-dispatch refunds need a human" case. The seller has had the
     * parcel and the policy's whole window to object and has not looked.
     *
     * Charging the seller is a different act on a different party, with no
     * finding behind it — nobody has inspected the goods, so there is no
     * evidence either way. That decision opens a case.
     *
     * The buyer's OWN reason code drives the refund, read off the order. A
     * hardcoded reason here would misreport why their money came back, and
     * `isFinalSaleExempt` branches on it — so inventing one could also route
     * around a final-sale line's terms.
     */
    case "return-inspect": {
      const capacity = await resolveRefundCapacity(order);
      if (capacity.remaining <= MONEY_EPSILON) {
        ctx.logger.info("obligation: uninspected return has nothing left to refund", {
          orderId: order.id,
        });
        return "acted";
      }

      const result = await processRefundAction({
        orderId: order.id,
        type: "full",
        amount: capacity.remaining,
        reasonCode: order.returnReasonCode ?? "not_as_described",
        reasonNote: `Auto-resolved in the buyer's favour — ${policy.describe}`,
        /*
         * Natural key on the ORDER. A repeated tick, or a human clicking
         * refund on the same uninspected return, collapses to one refund.
         */
        idempotencyKey: `return_uninspected_${order.id}`,
        ...(order.paymentId
          ? { method: "phonepe" as const, phonepeOrderId: order.paymentId }
          : { method: "manual" as const }),
        confirmIrrevocable: true,
        refundedBy: "system:obligation:return-inspect",
      });

      if (!result.ok) {
        /*
         * 🛑 `ActionResult`, so the envelope is always truthy and `!result`
         * could never fire (Root Cause #98). Escalating rather than retrying:
         * a refund that failed on an unattended tick needs someone to read the
         * gateway, not a louder loop.
         */
        await paymentCasesRepository().openOrObserve({
          kind: "manual_refund_due",
          subjectId: order.id,
          severity: "error",
          title: `Uninspected return — automatic refund of ₹${capacity.remaining.toFixed(2)} FAILED on ${order.id}`,
          detail: [
            "A received return was never inspected, so it auto-resolved in the buyer's favour — and the refund itself failed.",
            "",
            `Gateway error: ${result.error ?? "unknown"}`,
            "",
            `Order: ${order.id}`,
            `Owed: ₹${capacity.remaining.toFixed(2)}`,
            "",
            "Retrying from the admin order page is idempotent on this order.",
          ].join("\n"),
          entityType: "order",
          entityId: order.id,
          amountAtRisk: capacity.remaining,
          orderIds: [order.id],
          now: ctx.now,
        });
        return "escalated";
      }

      /*
       * The buyer is paid. Now the half a human owns — opened as its own case
       * so it is triaged on its own terms rather than hidden inside the
       * refund's record.
       */
      await paymentCasesRepository().openOrObserve({
        kind: "refund_mismatch",
        subjectId: `seller-charge:${order.id}`,
        severity: "warning",
        title: `Decide whether the seller bears ₹${capacity.remaining.toFixed(2)} — uninspected return on ${order.id}`,
        detail: [
          "A returned parcel reached the seller and was never inspected, so the buyer has been refunded automatically — the cover is unconditional and the seller had the goods and the full window.",
          "",
          "🛑 Whether the SELLER bears this is not automatic and must not be. Nobody inspected the goods, so there is no finding either way, and debiting a party other than the payer on a timer is the one thing the guardrail forbids outright.",
          "",
          `Order: ${order.id}`,
          `Store: ${order.storeId ?? "—"}`,
          `Refunded to the buyer: ₹${capacity.remaining.toFixed(2)}`,
          `Return received: ${order.returnReceivedAt?.toISOString() ?? "—"}`,
          `Buyer's stated reason: ${order.returnReasonCode ?? "—"}`,
          "",
          "Inspect the goods, then either charge the seller from the payout clawback or absorb it.",
        ].join("\n"),
        entityType: "order",
        entityId: order.id,
        amountAtRisk: capacity.remaining,
        orderIds: [order.id],
        now: ctx.now,
      });

      ctx.logger.info("obligation: uninspected return refunded to the buyer", {
        orderId: order.id,
        amount: capacity.remaining,
        refundId: result.data.refundId,
      });
      return "acted";
    }

    /*
     * Everything else moves money or debits a counterparty. Escalated with the
     * policy's own description, so the case says what happened rather than
     * naming an obligation kind nobody outside this file recognises.
     *
     * 🛑 Reached now only by kinds the REGISTRY marks `onDue: "escalate"` —
     * `return-receive` (a posted parcel that never arrived: the carrier is the
     * question, and neither party is at fault yet) and `payout-release`
     * (releasing money to a seller, which the quiet-period invariant says a
     * human confirms). The branch keeps the `policy.onDue === "act"` wording
     * below because a tenth kind added without a case arm lands here, and when
     * that happens the case should say so rather than imply the policy chose it.
     */
    default: {
      await paymentCasesRepository().openOrObserve({
        kind: "unprocessed_event",
        subjectId: `obligation:${obligation.id}`,
        severity: policy.onDue === "act" ? "warning" : "error",
        title: `${policy.describe} — ${order.id}`,
        detail: [
          policy.describe,
          "",
          `Order: ${order.id}`,
          `Obligation: ${obligation.kind}`,
          `Due at: ${obligation.dueAt.toISOString()}`,
          `Order status: ${order.status} / payment ${order.paymentStatus}`,
          "",
          policy.onDue === "act"
            ? "🛑 The policy permits this to be automatic and NO ACT BRANCH IMPLEMENTS IT. That is a gap, not a policy decision — a kind was added to the registry without a `case` arm in `performAction`. Resolve by hand, then add the branch."
            : "This tier always requires a human — goods have left the seller, or a party other than the payer would be debited.",
        ].join("\n"),
        entityType: "order",
        entityId: order.id,
        orderIds: [order.id],
        now: ctx.now,
      });
      return "escalated";
    }
  }
}

export async function runObligationSweep(ctx: JobContext): Promise<ObligationSweepResult> {
  const result: ObligationSweepResult = {
    due: 0,
    acted: 0,
    escalated: 0,
    superseded: 0,
    blocked: 0,
    failed: 0,
  };

  const repo = obligationsRepository();
  let due: ObligationDocument[];
  try {
    due = await repo.listDue(ctx.now, 100);
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("obligation sweep: due query failed", { err });
    return result;
  }

  result.due = due.length;
  if (due.length === 0) {
    ctx.logger.info("obligation sweep: nothing due");
    return result;
  }

  for (const obligation of due) {
    try {
      const policy = OBLIGATION_POLICIES[obligation.kind];

      /*
       * 🛑 THE RE-READ. See the module header — this is what makes the
       * collection an index rather than truth.
       */
      const order = await orderRepository.findById(obligation.subjectId);

      if (!order) {
        await repo.close(obligation.subjectId, obligation.kind, {
          state: "superseded",
          closeReason: "the subject no longer exists",
          now: ctx.now,
        });
        result.superseded += 1;
        continue;
      }

      if (!policy.precondition(order)) {
        /*
         * The premise evaporated — the seller accepted, the buyer posted, the
         * order was cancelled by someone else. This is the NORMAL outcome of a
         * race between the index and the subject, and it must not be reported
         * as a failure or counted as noise.
         */
        await repo.close(obligation.subjectId, obligation.kind, {
          state: "superseded",
          closeReason: "the policy's precondition no longer holds",
          now: ctx.now,
        });
        result.superseded += 1;
        continue;
      }

      /*
       * Ordering, declaratively. A `payout-release` whose return window is
       * still open must not fire, and `delivery-confirm` must not fire while a
       * transit claim is open — otherwise a parcel lost in the post
       * auto-confirms, opens a return window, and starts the seller's payout
       * clock.
       */
      if (policy.blockedBy?.length) {
        const open = await repo.listOpenForSubject(obligation.subjectId);
        const blocking = open.filter(
          (o) => o.id !== obligation.id && policy.blockedBy!.includes(o.kind),
        );
        if (blocking.length > 0) {
          result.blocked += 1;
          ctx.logger.info("obligation: blocked by an earlier one", {
            orderId: order.id,
            kind: obligation.kind,
            blockedBy: blocking.map((b) => b.kind),
          });
          continue;
        }
      }

      const outcome = await performAction(ctx, obligation, order);
      await repo.close(obligation.subjectId, obligation.kind, {
        state: outcome === "acted" ? "acted" : "escalated",
        closeReason:
          outcome === "acted"
            ? "the deadline passed and the policy's action was taken"
            : "the deadline passed and a case was opened for a human",
        now: ctx.now,
      });
      if (outcome === "acted") result.acted += 1;
      else result.escalated += 1;
    } catch (err) {
      void normalizeError(err);
      result.failed += 1;
      ctx.logger.error("obligation sweep: one obligation failed — continuing", {
        id: obligation.id,
        kind: obligation.kind,
      });
    }
  }

  ctx.logger.info("obligation sweep complete", { ...result });
  return result;
}
