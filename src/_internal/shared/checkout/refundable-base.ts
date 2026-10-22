/**
 * How much of an order can still be refunded, and what is withheld.
 *
 * ONE owner for two numbers that were previously computed four different ways
 * and disagreed with each other and with the money actually moved.
 *
 * WHY:
 *
 * · **D1** — the over-refund guard compared `amount > order.totalPrice`, i.e.
 *   against the ORDER TOTAL rather than the remaining balance, while its own
 *   docstring promised "≤ remaining refundable amount". So ₹500 and then
 *   another ₹500 both passed on a ₹600 order: **₹1,000 refunded, two real
 *   gateway calls, both successful.**
 *
 * · **D3** — `isFull` was `amount >= order.totalPrice`, so a split refund
 *   (₹300 + ₹200 of ₹500) never reached `status: "refunded"` and the order
 *   stayed fully refundable forever.
 *
 * · **D32** — the platform fee is non-refundable by policy, and the only code
 *   implementing that withheld ~10x too much (see `platformFeeWithheld`).
 */

import { roundRupees } from "../../../utils/number.formatter";

/**
 * Half a paisa. The tolerance exists because these are IEEE-754 sums of 2dp
 * components: `0.1 + 0.2 > 0.3` is TRUE in floating point, so an exact
 * comparison would reject a legitimate final refund that exactly exhausts the
 * balance. Half a paisa is below the smallest representable money unit, so it
 * cannot admit a real over-refund.
 */
export const MONEY_EPSILON = 0.005;

/** The subset of an order this module needs. Keeps it testable and pure. */
export interface RefundableOrderLike {
  totalPrice: number;
  platformFee?: number;
  platformFeeGst?: number;
  refunds?: ReadonlyArray<{ amount: number; status?: string }>;
  /**
   * D46/D47 — points applied at checkout, in points (1 point = ₹1).
   *
   * 🛑 Subtracted from the refundable base, because **a refund can only return
   * money that was collected.** On a ₹1,000 order settled with 250 points the
   * card was charged ₹750; refunding the full base would hand the buyer ₹1,000
   * and then `reverseRedemptionForOrder` would hand back 250 points on top —
   * ₹250 of real money created out of a discount.
   *
   * The points themselves come back as POINTS, never as cash. That is not a
   * stylistic choice: `pointsLedger`'s header states it as a legal boundary,
   * because paying a balance out in rupees is what makes it stored value, which
   * in India is PPI territory with RBI authorisation attached.
   */
  pointsApplied?: number;
}

/**
 * The platform fee actually withheld on a refund: the amount CHARGED, never a
 * recomputed percentage.
 *
 * 🛑 This replaces the single worst money defect found in the audit (D32).
 * `previewCancellationRefund` did:
 *
 *     const effectiveRate = platformFeePercent * (1 + gstPercent / 100);
 *     const feeDeducted   = (grossRefund * effectiveRate) / 100;
 *
 * — a PERCENTAGE OF THE REFUND, which ignores `commissions.platformFeeMax`
 * (default **₹10**) entirely and ignores `order.platformFee`, the amount that
 * was actually collected and is stored on the order. On a ₹5,000 order at 2% +
 * 18% GST it deducted **₹118** from a buyer who had paid **₹11.80** — keeping
 * roughly ₹106 of their goods money and labelling it a platform fee. The
 * overcharge grows with order value, so it is largest exactly where it is most
 * noticeable.
 *
 * `platformFeeGst` is read from the order and only DERIVED for rows written
 * before that field existed (2026-10-21). The derivation takes `gstPercent`
 * from the caller rather than reading settings itself, so this stays pure and
 * so a caller cannot accidentally reach for today's rate when the order is
 * from last year — which is the mistake the whole function exists to undo.
 */
export function platformFeeWithheld(
  order: Pick<RefundableOrderLike, "platformFee" | "platformFeeGst">,
  /** Only consulted for legacy orders with no stored `platformFeeGst`. */
  legacyGstPercent?: number,
): number {
  const fee = order.platformFee ?? 0;
  if (fee <= 0) return 0;
  const gst =
    order.platformFeeGst ??
    (typeof legacyGstPercent === "number" ? roundRupees((fee * legacyGstPercent) / 100) : 0);
  return roundRupees(fee + gst);
}

/**
 * The ceiling every refund is measured against.
 *
 * 🛑 `totalPrice − platformFeeWithheld`, NOT `totalPrice`. The platform fee is
 * non-refundable in every scenario — a decided policy, and one the product
 * already states: `REFUND_COPY.request.acknowledgments[2]` tells the buyer
 * "platform fees may be non-recoverable".
 *
 * This correction matters twice over. Phase 1's cumulative cap has to compare
 * against THIS, or a refund can exceed what the buyer is owed; and `isFull`
 * has to compare against THIS, or the largest possible refund is strictly less
 * than `totalPrice` and **an order can never reach `status: "refunded"`** —
 * which is what the old `amount >= totalPrice` test guaranteed.
 *
 * 🛑 And `pointsApplied` comes off too (D46/D47). A refund returns MONEY, and
 * the money collected was `totalPrice − pointsApplied`; the points go back
 * through `reverseRedemptionForOrder` as points. Leaving them in the base would
 * refund them twice — once in rupees here and once in points there — which is
 * the one way this feature could manufacture real money from a discount.
 *
 * Absent means zero, so every order written before the tender existed is
 * unaffected, and `isFull` still reaches the exhausted state on them exactly as
 * before.
 */
export function refundableBase(
  order: RefundableOrderLike,
  legacyGstPercent?: number,
): number {
  return roundRupees(
    Math.max(
      0,
      order.totalPrice -
        platformFeeWithheld(order, legacyGstPercent) -
        Math.max(0, order.pointsApplied ?? 0),
    ),
  );
}

/**
 * Sum of refunds that have COMMITTED money, i.e. everything not `failed`.
 *
 * 🛑 A `reserved` entry counts. The two-phase write reserves before calling the
 * provider and settles after, so between those two points the money may well
 * have left — excluding reserved entries would let a concurrent request refund
 * against a balance that is already spoken for, which is the TOCTOU the
 * reservation exists to close. A `failed` entry releases its reservation by
 * being skipped here, which is why no explicit release step is needed.
 *
 * `status` is optional on `OrderRefundEvent`: rows written before the
 * two-phase scheme have none, and those are all committed refunds, so a
 * missing status must count.
 */
export function committedRefundTotal(order: RefundableOrderLike): number {
  return roundRupees(
    (order.refunds ?? [])
      .filter((r) => r.status !== "failed")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0),
  );
}

export interface RefundCapacity {
  /** `totalPrice` less the non-refundable platform fee. */
  base: number;
  /** Already committed (processed or reserved). */
  committed: number;
  /** `base − committed`, floored at zero. */
  remaining: number;
  /** The non-refundable amount, for disclosure to the buyer. */
  withheld: number;
}

/** Everything a caller needs to decide and to EXPLAIN a refund decision. */
export function refundCapacity(
  order: RefundableOrderLike,
  legacyGstPercent?: number,
): RefundCapacity {
  const base = refundableBase(order, legacyGstPercent);
  const committed = committedRefundTotal(order);
  return {
    base,
    committed,
    remaining: roundRupees(Math.max(0, base - committed)),
    withheld: platformFeeWithheld(order, legacyGstPercent),
  };
}

/**
 * Would this refund exhaust the refundable base?
 *
 * Measured against `base`, not `totalPrice` — see `refundableBase`. The
 * epsilon makes an exactly-exhausting refund count as full rather than
 * leaving a sub-paisa residue that keeps the order refundable forever.
 */
export function wouldBeFullRefund(
  order: RefundableOrderLike,
  amount: number,
  legacyGstPercent?: number,
): boolean {
  const { base, committed } = refundCapacity(order, legacyGstPercent);
  return committed + amount >= base - MONEY_EPSILON;
}
