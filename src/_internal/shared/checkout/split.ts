/**
 * Group-purchase contribution splits — the ONE owner of the invariant.
 *
 * A coordinator divides what a grouped line costs among its members. They may
 * type absolute amounts or percentages, and the total may come out at or ABOVE
 * the landed cost; the excess belongs to the seller.
 *
 * ## The invariant
 *
 * ```
 * landedCost = goods + shipping + fees + add-ons        (per order group)
 *
 * contribution(member) = percent × landedCost   OR   a typed amount
 * require:  Σ(contributions) ≥ landedCost
 * surplus:  Σ(contributions) − landedCost
 * ```
 *
 * Percentages summing above 100% and typed amounts summing above the landed
 * cost are **the same case**, so one rule covers both and there is no
 * mode-specific branch to get wrong.
 *
 * ## Why the surplus becomes `lockedPrice`
 *
 * `unitPriceFor` already honours `lockedPrice` ahead of everything else — that
 * is how an accepted offer BELOW list is charged correctly. An agreed total
 * ABOVE list is the same mechanism in the other direction, so GST is charged on
 * what was actually paid, the payout base rises by the surplus,
 * `refundableBase` ceilings at the agreed amount, and the invoice needs no new
 * line. No new money term anywhere.
 */

import { roundRupees } from "../../../utils/number.formatter";

/** A member's share, as the coordinator expressed it. */
export interface SplitContribution {
  productId: string;
  /** `"percent"` reads `percent`; `"amount"` reads `amount`. */
  splitMode: "amount" | "percent";
  /** 0–100. Required when `splitMode === "percent"`. */
  percent?: number;
  /** Decimal rupees. Required when `splitMode === "amount"`. */
  amount?: number;
}

export interface SplitResolution {
  /** Per member, in input order, after rounding. */
  resolved: Array<{ productId: string; amount: number }>;
  /** What the members together put in. */
  contributed: number;
  /** `contributed − landedCost`, never negative (see `shortfall`). */
  surplus: number;
  /** `landedCost − contributed` when the split is short, else 0. */
  shortfall: number;
  /** The invariant holds. A caller must refuse to commit when false. */
  valid: boolean;
}

/**
 * Resolve contributions against a landed cost.
 *
 * Pure. No I/O, no clock — the landed cost is computed by the caller from the
 * order group it already has.
 *
 * 🛑 ROUNDS ONCE, at the end of each member's amount, and then puts the
 * ROUNDING REMAINDER on the last member. Rounding each percentage
 * independently and summing is how a 3-way 33.33% split charges a rupee less
 * than the agreed total and the surplus silently goes negative — the same
 * remainder discipline `allocateAcrossMembers` uses for bundle tax.
 */
/**
 * `percent` of `amount`, where `percent` is 0–100.
 *
 * 🛑 A NAMED HELPER rather than the division written inline, for legibility
 * to a reader AND to `audit-money-units`. That audit flags a scale division
 * beside a money identifier because it is the exact shape of the 2026-05
 * minor-unit bug — a conversion left behind by a migration — and a
 * percentage conversion is visually identical to it. Two such lines are two
 * judgement calls; one helper is a single place to establish that this
 * divisor is about PERCENTAGES and never about currency scale.
 *
 * 🛑 That audit reads COMMENTS as well as code, so this one cannot quote the
 * expression it is about: a worked example of the shape is indistinguishable
 * from the shape. Reading comments is correct of it — a stale "stored in
 * minor units" remark in prose is one of the things it hunts, and Root Cause
 * #87 is the opposite mistake, an audit that stripped comments and so
 * counted a commented-out registration as live.
 */
// audit-money-units-ok: a percent-to-fraction conversion, not a minor-unit conversion
const applyPercent = (percent: number, amount: number): number => (percent / 100) * amount;

export function resolveSplit(
  contributions: readonly SplitContribution[],
  landedCost: number,
): SplitResolution {
  const resolved: Array<{ productId: string; amount: number }> = [];

  for (const c of contributions) {
    const raw =
      c.splitMode === "percent" ? applyPercent(c.percent ?? 0, landedCost) : (c.amount ?? 0);
    resolved.push({ productId: c.productId, amount: roundRupees(raw) });
  }

  /*
   * The remainder goes on the LAST member rather than being spread, so the
   * parts reconcile to the total exactly and the discrepancy is one member's
   * single rupee rather than a fraction on everybody.
   *
   * Only for a pure PERCENT split: typed amounts are what the coordinator
   * actually said, and silently adjusting one of them would charge somebody a
   * figure they did not enter.
   */
  const allPercent = contributions.every((c) => c.splitMode === "percent");
  if (allPercent && resolved.length > 0) {
    const pctTotal = contributions.reduce((s, c) => s + (c.percent ?? 0), 0);
    const target = roundRupees(applyPercent(pctTotal, landedCost));
    const sum = resolved.reduce((s, r) => s + r.amount, 0);
    const drift = roundRupees(target - sum);
    if (drift !== 0) {
      const last = resolved[resolved.length - 1];
      resolved[resolved.length - 1] = { ...last, amount: roundRupees(last.amount + drift) };
    }
  }

  const contributed = roundRupees(resolved.reduce((s, r) => s + r.amount, 0));
  const diff = roundRupees(contributed - landedCost);

  return {
    resolved,
    contributed,
    surplus: diff > 0 ? diff : 0,
    shortfall: diff < 0 ? -diff : 0,
    valid: diff >= 0,
  };
}

/**
 * The price to lock on the line, given the goods subtotal and a surplus.
 *
 * ## 🛑 THE TRAP THIS FUNCTION EXISTS TO PREVENT
 *
 * The percentage BASE is the landed cost — goods **plus shipping plus fees** —
 * because that is what the coordinator is really dividing. But `lockedPrice` is
 * the GOODS price of the line: the checkout adds shipping, the platform fee,
 * GST and the add-ons on top of it, independently.
 *
 * So locking the landed cost would charge shipping and every fee **TWICE** —
 * once inside `lockedPrice` and once again as the checkout's own terms. The
 * surplus rides on the goods price alone.
 *
 * That is the whole reason this is a named function rather than an expression
 * at a call site: `goods + surplus` and `landedCost + surplus` are both
 * plausible-looking one-liners and only one of them is a correct charge.
 */
export function lockedPriceWithSurplus(goodsSubtotal: number, surplus: number): number {
  return roundRupees(goodsSubtotal + surplus);
}
