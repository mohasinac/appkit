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
 * 🛑 This function is deliberately SMALL and deliberately does not refund
 * anything yet.
 *
 * The plan is explicit that **no automatic refund may exist until Phase 1's
 * idempotency and cumulative cap have landed** — "a sweep on top of a
 * non-idempotent refund that compares against `totalPrice` rather than the
 * remaining balance is a double-refund generator". Phase 1 HAS landed (step 8:
 * `idempotencyKey` required, cap against `refundableBase`, two-phase atomic
 * write), so the prerequisite is met — but the cancel-with-refund path also
 * needs `cancelOrder` to actually carry a `refundAmount`, which is D14 and is
 * NOT yet done: all four callers still omit it, so stock is restored and money
 * is not.
 *
 * So the acting branch writes ANCHORS and CLOSES WINDOWS — the genuinely safe
 * `act` tier — and everything that moves money escalates to a case, even where
 * the policy says `act`. That is a deliberate narrowing, recorded here rather
 * than silently: it is better to open a case a human closes in ten seconds
 * than to ship a refund path whose money half is missing.
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
     * Everything else moves money or debits a counterparty. Escalated with the
     * policy's own description, so the case says what happened rather than
     * naming an obligation kind nobody outside this file recognises.
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
            ? "🛑 The policy permits this to be automatic, but the money half is NOT built yet: `cancelOrder` still never receives a `refundAmount` (D14), so an automatic cancellation would restore stock and move no money. Resolve by hand until that lands."
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
