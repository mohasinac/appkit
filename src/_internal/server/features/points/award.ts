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

  const goods = orderTaxableValue(order as unknown as PayableOrderLike);
  const amount = roundPoints((goods * POINTS_EARN_PERCENT) / 100);

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
      `${POINTS_EARN_PERCENT}% back on ${order.id}: ₹${goods.toFixed(2)} of items.`,
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
