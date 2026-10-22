/**
 * Award purchase points on a COMPLETED order — the owner's rule, made real.
 *
 * ## Why this had to wait for completion to exist
 *
 * *"Points only get issued on successful purchases after buyer put reviews,
 * then only, if no review no points, that marks the complete order; they are
 * also assigned if the user [raises] no issues or updates after 7 days of
 * delivery."* Then: *"auto assigned after 7 days of delivery, when order is
 * marked complete; if review is given and order marked complete by the buyer
 * before — immediate disburse."*
 *
 * So the trigger is completion, and completion has TWO writers — the buyer's
 * fast path and the 7-day `order-complete` sweep — converging on one fact,
 * `completedAt`.
 *
 * ## 🛑 `pointsAwardedAt` IS the idempotency key, and it cannot be added later
 *
 * `pointsLedger` is append-only. An append does not deduplicate itself, and
 * `pointsRepository.append` takes no key — so two completion triggers firing
 * on one order would credit twice, **permanently, with no way to net it off.**
 * That is why the award was deliberately NOT written when the completion fact
 * was (the sweep's own comment says so): writing the expensive half of a
 * feature before its key exists is how an append-only ledger acquires a double
 * credit nobody can remove.
 *
 * The pattern is copied from `reconcileOrderShipping`, which faced exactly this
 * and solved it without a transaction: it writes `order.shippingReconciliation`
 * in the same step as the credit, precisely so that field can be the key.
 *
 * ## The base is post-discount GOODS
 *
 * Not the order total. "5% of what you paid" read literally includes shipping
 * and the platform fee, so we would issue points against postage handed to a
 * courier. And it excludes the points tender itself, or points breed points.
 *
 * `orderTaxableValue` is reused rather than a fresh sum: it is already the
 * post-discount, per-line, tax-backed-out goods figure, and it is already the
 * payout base — so the number the seller is paid on and the number they fund
 * points on are the same number, which is the property that makes the
 * seller-funded model explicable to them.
 *
 * ## 🛑 The STORE bears it
 *
 * Owner: *"so stores bear it"*, framed as *"like a sale discount for getting a
 * repeat customer."* So it is a DEDUCTION TERM in the payout, never a
 * clawback — and that works only because of an ordering guarantee worth
 * stating: `payout-release` is `blockedBy: ["order-complete"]`, so the gate
 * opens BECAUSE the order completed, and completion is the same event that
 * issues the points. The award is therefore always strictly before the payout
 * is computed, by construction rather than by timing luck.
 */

import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { pointsRepository } from "../../../../features/points/repository/points.repository";
import {
  POINTS_EARN_PERCENT,
  pointsExpiryFrom,
} from "../../../../features/points/schemas/firestore";
import { orderTaxableValue } from "../../../shared/checkout/order-math";
import type { PayableOrderLike } from "../../../shared/checkout/order-math";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";

export interface AwardPurchasePointsResult {
  awarded: number;
  skipped?: "already-awarded" | "not-complete" | "no-buyer" | "nothing-earnable";
}

function roundPoints(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Award points for one completed order. Safe to call from both triggers.
 *
 * Takes the order rather than an id when the caller already holds one — both
 * completion paths do, and re-reading it would pay a Firestore read to learn
 * what the caller just wrote.
 */
export async function awardPurchasePoints(
  order: OrderDocument,
): Promise<AwardPurchasePointsResult> {
  /*
   * The key. Checked first and checked again by the caller's own write
   * ordering — a double call is the NORMAL case here, not an edge: the buyer
   * completes early and the 7-day sweep later finds the order already
   * complete, or a retried action runs twice.
   */
  if (order.pointsAwardedAt) {
    return { awarded: 0, skipped: "already-awarded" };
  }

  if (!order.completedAt) {
    /*
     * Refused rather than treated as an implicit completion. The award is a
     * consequence of a fact somebody recorded; inferring the fact from the
     * award's own call site would let any caller mint points by asking.
     */
    return { awarded: 0, skipped: "not-complete" };
  }

  if (!order.userId) {
    serverLogger.error("purchase points: completed order has no buyer", {
      orderId: order.id,
    });
    return { awarded: 0, skipped: "no-buyer" };
  }

  /*
   * ── The earn base, and why the points tender comes off it (D46/D47) ───────
   *
   * 🛑 **Points must not breed points.** Earning on an amount that was itself
   * paid with points is a loop: spend 100 points, earn 5 on them, spend those,
   * earn again. It converges rather than exploding, so nothing would ever
   * error — it just leaks margin, and it is indefensible on a balance sheet
   * because the issuance has no sale behind it.
   *
   * The base is therefore the GOODS VALUE ACTUALLY PAID FOR IN MONEY. `goods`
   * already excludes shipping and every fee (`orderTaxableValue` reads
   * `items[]` only — we should not issue points against postage handed to a
   * courier); this subtracts the part of those goods the buyer settled with
   * their balance.
   *
   * 🛑 Clamped at zero rather than assumed smaller. `pointsApplied` is capped
   * at 50% of the ORDER TOTAL, which includes shipping and fees — so on an
   * order that is mostly shipping it can legitimately exceed the goods value,
   * and the subtraction can go negative. `roundPoints` of a negative is a
   * DEBIT, so without the clamp a buyer completing such an order would have
   * points taken away by the reward programme.
   */
  const goods = orderTaxableValue(order as unknown as PayableOrderLike);
  const moneyPaidForGoods = Math.max(0, goods - Math.max(0, order.pointsApplied ?? 0));
  /*
   * `x * (PERCENT / 100)`, not `(x * PERCENT) / 100` — the same value, written
   * the way every fee in `fees/calculator.ts` is
   * (`subtotal * (commissions.platformFeePercent / 100)`). The division
   * belongs to the PERCENT, and grouping it that way is what distinguishes a
   * percentage from the subunit-conversion `/100` that `audit-money-units`
   * exists to catch — which read the old grouping as exactly that.
   *
   * 🛑 Merge resolution, 2026-10-22: both sides of this conflict were real and
   * independent, so the answer is BOTH, not either.
   *
   *   - the BASE is `moneyPaidForGoods`, not `goods` — points must not be
   *     issued against the part of the order the buyer settled with points,
   *     which is what the whole docstring above this line exists to explain.
   *     Taking only the other side would have silently restored
   *     points-on-points issuance AND left that docstring describing a
   *     variable that no longer existed.
   *   - the GROUPING is the other side's, because the audit reasoning is
   *     correct and applies to this expression whatever its base.
   */
  const amount = roundPoints(moneyPaidForGoods * (POINTS_EARN_PERCENT / 100));

  if (amount <= 0) {
    /*
     * A fully-cancelled or zero-value order. Marked as awarded anyway below so
     * the sweep stops revisiting it — "we looked and there was nothing to
     * give" is a decision, and leaving it unmarked would re-read this order on
     * every tick forever.
     */
    await orderRepository
      .update(order.id, { pointsAwardedAt: new Date() })
      .catch((err: unknown) => {
        void normalizeError(err);
      });
    return { awarded: 0, skipped: "nothing-earnable" };
  }

  const now = new Date();

  await pointsRepository.append({
    userId: order.userId,
    kind: "purchase_earn",
    amount,
    orderId: order.id,
    /*
     * Names the base and the rate, because "47 points" alone is unexplainable
     * later — and written once rather than re-derived, so it stays true of this
     * moment even if the order is edited afterwards.
     */
    description:
      `${POINTS_EARN_PERCENT}% back on ${order.id}: ₹${moneyPaidForGoods.toFixed(2)} of items` +
      // Named explicitly, because an unexplained gap between the order's item
      // value and the earn base is exactly the kind of figure a buyer writes
      // in to ask about — and the answer ("you paid part of it with points")
      // is a fact about their own order that they can check.
      ((order.pointsApplied ?? 0) > 0
        ? ` (₹${goods.toFixed(2)} of items less ${order.pointsApplied} points).`
        : "."),
    expiresAt: pointsExpiryFrom(now),
  });

  /*
   * 🛑 The key is written AFTER the credit, and that ordering is deliberate.
   *
   * A crash between them leaves a credited buyer and an order that looks
   * unawarded — so the next trigger credits a second time. That is the lesser
   * evil, and the same choice `reconcileOrderShipping` documents: the reverse
   * ordering would mark the order done and then fail to pay, which is money a
   * buyer was promised and silently never got. An extra credit is visible in
   * the ledger and reversible by an `admin_adjustment`; a missing one is
   * invisible to everybody.
   */
  await orderRepository.update(order.id, {
    pointsAwardedAt: now,
    pointsAwarded: amount,
  });

  serverLogger.info("purchase points awarded", {
    orderId: order.id,
    userId: order.userId,
    goods,
    amount,
  });

  return { awarded: amount };
}
