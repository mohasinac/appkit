/**
 * Cancel an order AND give the money back — one owner, three callers.
 *
 * ## D14, and why passing the amount was only half of it
 *
 * `cancelOrder(orderId, reason, refundAmount?)` has carried an optional
 * `refundAmount` since it was written, and **all four callers omitted it**. So
 * cancelling a *paid* order restored stock and left the money with us, while
 * `previewCancellationRefund` showed the buyer a figure nothing honoured.
 *
 * 🛑 **But passing the amount alone would have made it WORSE.** `cancelOrder`'s
 * body writes `{ refundAmount, refundStatus: "pending" }` and nothing else —
 * there is no provider call anywhere in it. So the obvious fix creates a *new*
 * dead state: a recorded refund intent that nothing ever settles, which is
 * strictly worse than today's honest silence because it reads, in the database,
 * as though a refund is on its way. The amount and the movement have to land
 * together, which is why this module exists rather than a one-line edit at each
 * call site.
 *
 * ## The decision table
 *
 * Every row cancels the order and **restores its stock** — see `releaseStock`,
 * which closes a second half of D14 the plan had recorded backwards. The table
 * is only about the money.
 *
 * | condition | what happens to the money |
 * |---|---|
 * | `paymentStatus !== "paid"` | **nothing** — nothing was ever captured |
 * | nothing left refundable | nothing — already refunded in full |
 * | goods have left the seller | intent recorded, **case opened** — a human decides |
 * | paid by cash / UPI-manual / EMI | intent recorded, **case opened** — there is no automatic rail |
 * | paid through the gateway | **refunded automatically**, in full, once |
 *
 * The last row is the only automatic money movement, and it satisfies the
 * plan's guardrail for one: the ceiling is an amount we captured, the recipient
 * is the payer, and no counterparty is debited.
 *
 * ## Three things that are load-bearing
 *
 * **It goes through `processRefundAction`, never `payment.refund()` directly.**
 * That action owns the idempotency claim, the cumulative cap against
 * `refundableBase`, and the two-phase reserve/settle write around the provider
 * call. A direct provider call here would reintroduce every defect step 8
 * closed — D1, D2, D6 and D7 at once.
 *
 * **The key is `cancel_{orderId}`** — a NATURAL key, so a double-clicked Cancel
 * button, a retried server action and a sweep all collapse to one refund. A
 * `randomUUID()` here would be D2 wearing a new name.
 *
 * ## Points ARE reversed here now (Phase P)
 *
 * `pointsLedger`'s own header states the rule as a legal boundary: *"points
 * spent on a cancelled order are returned as points"* — never as money, because
 * paying them out in rupees is what would make this stored value, which in
 * India is PPI territory with RBI authorisation attached.
 *
 * `reverseRedemptionForOrder` is that rule's first writer; the kind had been
 * declared with none since it was written (D48). It is idempotent on the order
 * — one reversal per order, checked by query before the write, because an
 * append-only ledger cannot net off a double reversal.
 *
 * 🛑 It is a NO-OP today and still correct to call. No order has ever consumed
 * points: the one code path that redeemed any was deleted on 2026-10-21
 * because it debited the buyer without reducing the charge (D46 — see the note
 * at its former site in `checkout/actions.ts`), and it had no caller, route
 * field or UI tender before that. So the query finds no redemption and returns
 * `{ reversed: 0 }`.
 * Wiring it now rather than later is the cheap half — the expensive half is the
 * ledger write, which is already keyed. When redemption becomes a real tender,
 * cancellation already gives the points back instead of needing to remember to.
 *
 * **Cancel, then stock, then money.** The cancellation is the urgent half and
 * must not be held hostage to a gateway round trip; the restock is a local
 * write another buyer is actively waiting on; the refund is the one step that
 * can hang for a full network timeout. The cost of that ordering is a window
 * where the order is `cancelled` with the money still held — which is exactly
 * why `refundAmount` is written *at cancellation time*, before the provider is
 * called: a crash in the window leaves a detectable artefact rather than
 * nothing, and R5 in `paymentReconcile` is the thing that finds it. The reverse
 * ordering has no such consolation, because a refund posted against a live
 * order that then fails to cancel is money gone from an order the buyer still
 * expects to receive.
 */

import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import type { CancellationRefundOutcome } from "../../../../features/orders/types/index";
import { isManualPaymentMethod } from "../../../../features/orders/constants/payment-window";
import { MONEY_EPSILON } from "../../../shared/checkout/refundable-base";
/*
 * 🛑 `refundCapacity` and NOT `totalPrice − platformFeeWithheld`, and the
 * difference matters on a partially-refunded order: capacity subtracts what has
 * already been committed, so cancelling an order that already had one line
 * refunded returns the REMAINDER rather than the whole base a second time. The
 * naive expression would over-refund by exactly the earlier refund, and
 * `reserveRefund`'s transactional cap would then reject it — so it would
 * surface as a confusing failure rather than a loss, but it would surface.
 *
 * Through `resolveRefundCapacity` rather than the pure function, so the
 * settings read that legacy orders need has one owner shared with the sweep.
 */
import { resolveRefundCapacity } from "../refunds/capacity";
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
import { processRefundAction } from "../refunds/actions";
import { restoreStockForOrder } from "../checkout/stock-restore";
import { pointsRepository } from "../../../../features/points/repository/points.repository";
import { getAdminDb } from "../../../../providers/db-firebase";
import { classifyCancellation } from "./service";
import type { HistoryActor } from "../../../shared/history/types";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";

export interface CancelWithRefundOptions {
  reason: string;
  /**
   * The uid of whoever asked for this — a buyer, a seller, or an admin.
   *
   * 🛑 OPTIONAL, and omitted by the obligation sweep on purpose.
   * `HistoryActor.uid`'s own doc says it is "absent for `system` (cron jobs,
   * Firestore triggers)", so stamping a literal `"system"` into a field that
   * otherwise only ever holds Firebase uids would make `actorUid === someUid`
   * comparisons quietly wrong and would read, in a timeline, as a user account
   * named system.
   */
  actorUid?: string;
  actorRole: HistoryActor["role"];
  /** Overrides the history trigger label with the calling path's name. */
  trigger?: string;
}

export interface CancelWithRefundResult {
  order: OrderDocument;
  refund: CancellationRefundOutcome;
}

/**
 * Put the units back on the shelf.
 *
 * ## 🛑 A SECOND HALF OF D14 THAT THE PLAN RECORDED BACKWARDS
 *
 * The plan's D14 entry reads *"Stock is restored; **money is not** — including
 * on a `paid` order."* Measured 2026-10-21: **neither is.**
 * `restoreStockForOrder` has exactly four call sites —
 * `paymentWindowTimeout`, `pendingOrderTimeout`,
 * `adminRejectPaymentAsFraudAction`, and its own definition — and **not one of
 * them is a user-initiated cancellation.** So a buyer, seller or admin
 * cancelling an order left its units decremented, and the item stayed
 * unavailable to every other buyer permanently. That is Root Cause #27's
 * "holds stock forever" shape, reached by a different door.
 *
 * The plan's sentence is how the mistake survived: it describes the TIMEOUT
 * jobs' behaviour and generalises it to all four callers, so "stock is fine,
 * only money is broken" reads as settled and nobody re-checks.
 *
 * ## Why this is a separate call and not `extraOrderUpdate`
 *
 * `restoreStockForOrder` offers to write the caller's cancellation fields
 * inside its own transaction, and its docstring explains why: atomicity, so
 * the two "can never partially apply". Taking that offer would mean bypassing
 * `orderRepository.cancelOrder` — and with it the status transition guard, the
 * `statusHistory` entry and the obligation reconciliation, all of which live in
 * `updateWithHistory`. Three mechanisms built on purpose, lost to gain
 * atomicity on a pair of writes whose split failure is both detectable
 * (`status: "cancelled"` with `stockRestored` unset) and repairable by calling
 * this again.
 *
 * That repair is free because the function is **idempotent on its own flag** —
 * `if (order.stockRestored) return` — which is independent of the order's
 * status, so running it after the cancellation is fine.
 *
 * ## It never throws upward
 *
 * The cancellation has already been written and the buyer has already been told
 * their order is cancelled. Failing the call now would report a failure for
 * something that succeeded, and would leave the caller unsure whether to
 * retry — while the money half still needs to run. Logged loudly instead.
 */
async function releaseStock(order: OrderDocument): Promise<void> {
  if (order.stockRestored) return;
  try {
    await restoreStockForOrder(getAdminDb(), order, {});
  } catch (err) {
    void normalizeError(err);
    serverLogger.error(
      "cancellation: stock was NOT restored — these units are unavailable to other buyers until this is repaired",
      { orderId: order.id },
    );
  }
}

/**
 * Give back any points this order consumed — `redemption_reversal`.
 *
 * 🛑 As POINTS, never as money. `pointsLedger`'s header states that as a legal
 * boundary rather than a preference: cash-refunding them is what would make
 * this stored value, and stored value in India is PPI territory with RBI
 * authorisation attached.
 *
 * Idempotent on the order inside the repository, so calling it on every
 * cancellation — including a re-run — is safe. Currently a no-op for every
 * order, because nothing consumes points yet; wiring it now means cancellation
 * will already be correct on the day redemption becomes a real tender, rather
 * than needing somebody to remember.
 *
 * Never throws upward: the order is cancelled and the buyer has been told. A
 * failed reversal is points the buyer should have back, so it is logged loudly
 * and the balance is recoverable by an admin adjustment — whereas failing the
 * cancellation here would leave them unable to retry something that already
 * happened.
 */
async function returnPoints(order: OrderDocument): Promise<void> {
  try {
    const { reversed } = await pointsRepository.reverseRedemptionForOrder(
      order.id,
      `order ${order.id} was cancelled`,
    );
    if (reversed > 0) {
      serverLogger.info("cancellation: points returned to the buyer", {
        orderId: order.id,
        points: reversed,
      });
    }
  } catch (err) {
    void normalizeError(err);
    serverLogger.error(
      "cancellation: points were NOT returned — the buyer is short by whatever they spent",
      { orderId: order.id },
    );
  }
}

/** Record that money is owed and nobody can move it automatically. */
async function openOwedCase(
  order: OrderDocument,
  amount: number,
  why: Extract<CancellationRefundOutcome, { moved: "owed" }>["why"],
  detailLines: string[],
): Promise<string | undefined> {
  try {
    const result = await paymentCasesRepository().openOrObserve({
      kind: "manual_refund_due",
      /*
       * Keyed on the ORDER, not on the attempt. A retried cancellation, a
       * sweep and an operator clicking twice are the same problem — one case,
       * one notification. Including a timestamp here is what makes a queue
       * unusable within a week.
       */
      subjectId: order.id,
      severity: "error",
      title: `Refund of ₹${amount.toFixed(2)} owed on cancelled order ${order.id}`,
      detail: [
        ...detailLines,
        "",
        `Order: ${order.id}`,
        `Buyer: ${order.userId}`,
        `Store: ${order.storeId ?? "—"}`,
        `Payment method: ${order.paymentMethod ?? "unknown"}`,
        `Gateway reference: ${order.paymentId ?? "—"}`,
        `Amount owed: ₹${amount.toFixed(2)}`,
        "",
        "The order is cancelled and its stock is restored. `refundAmount` is recorded on the order with `refundStatus: \"pending\"`, so this case and the order agree about what is owed.",
      ].join("\n"),
      entityType: "order",
      entityId: order.id,
      amountAtRisk: amount,
      orderIds: [order.id],
      ...(order.paymentId ? { gatewayPaymentId: order.paymentId } : {}),
    });
    return result.id;
  } catch (err) {
    void normalizeError(err);
    /*
     * The case is the RECORD, not the obligation. Failing to write it must not
     * fail the cancellation — the buyer's order is already cancelled and their
     * stock released. Logged loudly, and the amount is still on the order, so
     * D14's (c) detector finds it on the next pass regardless.
     */
    serverLogger.error("cancellation refund: could not open the owed case", {
      orderId: order.id,
      amount,
      why,
    });
    return undefined;
  }
}

/**
 * Cancel an order and settle whatever money that owes.
 *
 * Callers pass the order they have already fetched and authorised. That is not
 * only a saved read: the authorisation differs per caller (a buyer owns the
 * order, a seller owns the store, an admin owns neither) and this function must
 * not be the place that decides it.
 */
export async function cancelOrderWithRefund(
  order: OrderDocument,
  opts: CancelWithRefundOptions,
): Promise<CancelWithRefundResult> {
  const ctx = {
    actor: {
      role: opts.actorRole,
      ...(opts.actorUid ? { uid: opts.actorUid } : {}),
    },
    reason: opts.reason,
    ...(opts.trigger ? { trigger: opts.trigger } : {}),
  };

  /*
   * `refundedBy` on the other hand is a REQUIRED string on
   * `ProcessRefundInput`, and a prefixed sentinel is the established shape
   * there — `checkout/actions.ts` already passes
   * `"system:checkout-auto-refund"`. Prefixed rather than bare so it can never
   * be mistaken for a uid by something that only checks for a non-empty value.
   */
  const refundedBy = opts.actorUid ?? `system:${opts.trigger ?? "cancellation"}`;

  /*
   * ── The unpaid case, and the asymmetry this comment exists to protect ─────
   *
   * 🛑 `paymentWindowTimeout` and `pendingOrderTimeout` call `cancelOrder` with
   * NO amount, and that is CORRECT, not an oversight of the same kind D14
   * describes: both sweeps exist precisely to cancel orders that were never
   * paid. Someone reading D14 ("no cancel path passes a refund amount") will be
   * tempted to make them uniform with the three user-initiated paths. Don't —
   * a refund against a payment that never happened is not a no-op, it is a
   * reserved slot against a `refundableBase` of zero, which `reserveRefund`
   * refuses and which would make the sweeps start throwing.
   *
   * The guard lives here rather than at the three call sites so the rule has
   * one statement, and so a fourth caller inherits it.
   */
  if (order.paymentStatus !== "paid") {
    const cancelled = await orderRepository.cancelOrder(order.id, opts.reason, undefined, ctx);
    await releaseStock(order);
    return { order: cancelled, refund: { moved: "none", why: "not-paid", amount: 0 } };
  }

  const capacity = await resolveRefundCapacity(order);

  if (capacity.remaining <= MONEY_EPSILON) {
    /*
     * Paid, but already refunded in full — an order cancelled after its money
     * was returned by another path. Nothing owed, and writing an amount of zero
     * would set `refundStatus: "pending"` for a refund that will never come.
     */
    const cancelled = await orderRepository.cancelOrder(order.id, opts.reason, undefined, ctx);
    await releaseStock(order);
    return {
      order: cancelled,
      refund: { moved: "none", why: "nothing-refundable", amount: 0 },
    };
  }

  const amount = capacity.remaining;

  /*
   * The intent, written in the same patch as the cancellation. This is what
   * makes a crash in the window below detectable: `status: "cancelled"` with a
   * `refundAmount` and no settled refund event is a provable, findable state.
   */
  const cancelled = await orderRepository.cancelOrder(order.id, opts.reason, amount, ctx);

  /*
   * Stock before money. Restocking is a local write that another buyer is
   * actively waiting on; the refund is a network call that can hang for its
   * whole timeout. Doing the slow one first would hold the item hostage to the
   * gateway's latency for no benefit.
   */
  await releaseStock(order);
  await returnPoints(order);

  /*
   * ── Goods have left the seller ────────────────────────────────────────────
   *
   * Asks the EXISTING classifier rather than re-testing `shippingDate`, so
   * "has this been dispatched" has one definition shared with
   * `assertOrderCancellable`. Re-deriving it here is how two copies of a rule
   * start disagreeing (Root Cause #75) — and this particular rule is the one
   * the plan calls the single highest-value line in the obligation design.
   *
   * Note the two buyer paths cannot reach this branch: `assertOrderCancellable`
   * refuses a dispatched order outright ("request a return instead"), and
   * `cancelOrderForUser`'s own status gate admits only pending/confirmed. It is
   * reachable from the ADMIN route, which cancels any status the transition map
   * allows — and `shipped → cancelled` is allowed.
   */
  const route = classifyCancellation(order);
  if (route.route !== "cancel") {
    const caseId = await openOwedCase(cancelled, amount, "post-dispatch", [
      "This order was cancelled AFTER the goods were dispatched, so the refund was not issued automatically.",
      "",
      "Who bears the outbound shipping leg is a decision about this order, not a rule: the parcel physically moved and somebody paid a courier for it. Decide the amount, then refund from the admin order page.",
    ]);
    return {
      order: cancelled,
      refund: { moved: "owed", amount, why: "post-dispatch", ...(caseId ? { caseId } : {}) },
    };
  }

  /*
   * ── No automatic rail exists ──────────────────────────────────────────────
   *
   * Cash, UPI-manual and EMI reach `paymentStatus: "paid"` through the manual
   * payment review flow — an admin verified a screenshot. There is no gateway
   * transaction to reverse, so the money goes back by bank transfer and a human
   * records the UTR. Calling `processRefundAction` with `method: "manual"` here
   * would append a refund event claiming the money was returned when nobody has
   * sent it, which is the dead-state trap this module exists to avoid, one
   * level in.
   *
   * The missing-reference case is folded in for the same reason: a gateway
   * refund is order-keyed on `order.paymentId`, so without it there is nothing
   * to call, and guessing is not an option.
   */
  if (isManualPaymentMethod(order.paymentMethod)) {
    const caseId = await openOwedCase(cancelled, amount, "manual-payment", [
      `This order was paid by ${order.paymentMethod} — a manual method with no gateway transaction to reverse.`,
      "",
      "Transfer the amount to the buyer and record it from the admin order page, which captures the reference so the order and the bank statement agree.",
    ]);
    return {
      order: cancelled,
      refund: { moved: "owed", amount, why: "manual-payment", ...(caseId ? { caseId } : {}) },
    };
  }

  if (!order.paymentId) {
    const caseId = await openOwedCase(cancelled, amount, "no-gateway-reference", [
      "This order is marked paid but carries no gateway reference (`paymentId`), so an automatic refund has nothing to call.",
      "",
      "Find the payment in the gateway dashboard by amount and buyer, then refund from the admin order page.",
    ]);
    return {
      order: cancelled,
      refund: { moved: "owed", amount, why: "no-gateway-reference", ...(caseId ? { caseId } : {}) },
    };
  }

  /*
   * ── The automatic path ────────────────────────────────────────────────────
   *
   * `type: "full"` because the amount IS the whole refundable base — the
   * platform fee is withheld by policy, so "full" has never meant `totalPrice`
   * (see `refundableBase`). On a partially-refunded order the remainder is
   * still the rest of the base, so full is still the honest label.
   */
  const result = await processRefundAction({
    orderId: order.id,
    amount,
    /*
     * `changed_mind` is the honest default: a cancellation before dispatch is a
     * buyer deciding not to proceed with goods they never received. It is also
     * the conservative choice, because it is NOT final-sale exempt — so a
     * cancellation cannot be used to route around a final-sale listing's terms.
     *
     * 🛑 That gate cannot actually bite here, and it is worth knowing why
     * rather than discovering it: `finalSale` is per-LINE and a pre-dispatch
     * cancellation of a final-sale line would be refused by
     * `processRefundAction`. If that is ever reported as a bug, the fix is a
     * decision about whether final sale survives a pre-dispatch cancellation —
     * not a quiet swap to an exempt reason code here.
     */
    reasonCode: "changed_mind",
    reasonNote: `Order cancelled — ${opts.reason}`,
    /*
     * The natural key. A double-clicked Cancel button, a retried server action
     * and a future sweep all produce the same key, so the second one returns
     * the first's refundId as a success instead of issuing a second refund.
     */
    idempotencyKey: `cancel_${order.id}`,
    method: "phonepe",
    phonepeOrderId: order.paymentId,
    confirmIrrevocable: true,
    refundedBy,
  });

  /*
   * 🛑 UNWRAP THE ENVELOPE. `processRefundAction` is a `"use server"` action, so
   * it returns `ActionResult<T>` — `{ ok, data }`, never the payload. Treating
   * the envelope as the result is Root Cause #98, which cost nine seller edit
   * pages a blank form and a destructive save: an envelope is always truthy, so
   * `if (!result)` can never fire and `result.refundId` is silently `undefined`.
   */
  if (!result.ok) {
    const caseId = await openOwedCase(cancelled, amount, "gateway-failed", [
      "The order was cancelled and its stock restored, but the automatic gateway refund FAILED.",
      "",
      `Gateway error: ${result.error ?? "unknown"}`,
      "",
      "Retry the refund from the admin order page. It is idempotent on this order, so a retry cannot double-refund — if the first attempt did reach the gateway, the retry returns that same refund.",
    ]);
    serverLogger.error("cancellation refund: gateway refund failed — money still held", {
      orderId: order.id,
      amount,
      caseId,
    });
    return {
      order: cancelled,
      refund: { moved: "owed", amount, why: "gateway-failed", ...(caseId ? { caseId } : {}) },
    };
  }

  serverLogger.info("cancellation refunded", {
    orderId: order.id,
    amount,
    withheld: capacity.withheld,
    refundId: result.data.refundId,
    actorRole: opts.actorRole,
  });

  /*
   * Re-read, because `processRefundAction` wrote to the order twice after our
   * `cancelOrder` returned (reserve, then settle) — so the document we hold is
   * already stale, and handing a caller a stale order whose `refunds[]` is
   * empty would make every surface downstream show "no refund yet" on an order
   * that was just refunded.
   */
  const settled = await orderRepository.findById(order.id);
  return {
    order: settled ?? cancelled,
    refund: { moved: "gateway", amount, refundId: result.data.refundId },
  };
}
