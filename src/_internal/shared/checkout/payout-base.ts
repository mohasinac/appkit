/*
 * WHY: The amount a seller is paid, and the rates that explain it.
 *
 *      Split out of `order-math.ts` on 2026-10-31 because that file had
 *      reached its 1000-line ceiling and a split capture needs a THIRD caller
 *      of the same payout base — the two payout sweeps already share it, and a
 *      capture is instructed before any order exists, so it needs a
 *      line-shaped entry point beside the order-shaped one.
 *
 * WHAT: One per-line rule for backing tax out of an inclusive total, in both
 *       shapes, plus the commission rates a `payouts` row records.
 *
 * ## 🛑 THE SPLIT AND THE SWEEPS MUST AGREE TO THE RUPEE
 *
 * A seller paid one amount by the gateway and shown another by their dashboard
 * is the failure this file exists to prevent, and agreement is only structural
 * if both read the SAME rule — including the `?? 0` default. Defaulting a
 * missing rate to `DEFAULT_GST_RATE` in one path and `0` in the other diverges
 * for exactly the listings that carry no rate.
 *
 * The back-out is per ITEM, never blended: a mixed 5% + 18% group cannot be
 * undone with a single rate, and an order-level rate does not exist.
 *
 * ## 🛑 Two different things are called `gstRate` here
 *
 * `TaxableLineLike.gstRate` is the BUYER's tax on the goods.
 * `commissionRecordRates().gstRate` is GST on OUR COMMISSION. They collide
 * only in name, and `audit-tax-provider-boundary` matches on the name — which
 * is why both live here, commented, instead of being open-coded at each payout
 * writer where the distinction would have to be rediscovered.
 *
 * EXPORTS: PayableOrderLike, TaxableLineLike, orderTaxableValue,
 *          ordersTaxableValue, linesTaxableValue, commissionRecordRates
 *
 * @tag domain:checkout
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import { roundRupees } from "../../../utils/number.formatter";
import { commissionPercentToRate, taxableFromInclusive } from "../fees/calculator";

/** Exactly the fields `orderTaxableValue` reads. */
export interface PayableOrderLike {
  items?: Array<{
    quantity: number;
    unitPrice: number;
    cancelledQuantity?: number;
    /** Snapshotted at purchase. Absent or 0 means no tax to back out. */
    gstRate?: number;
  }>;
  /** The flat shape, authoritative when `items` is absent. */
  quantity?: number;
  unitPrice?: number;
  gstRate?: number;
}

/** One priced line, before any order exists. */
export interface TaxableLineLike {
  /** Tax-INCLUSIVE line total, from `lineTotalFor`. Never `price × quantity`. */
  lineTotal: number;
  gstRate?: number;
}

/**
 * The payout base for one order: taxable value, never the gross.
 *
 *   - inclusive seller, ₹999 @5% → buyer pays ₹999, taxable ₹951.43
 *   - exclusive seller types ₹999 → grossed up on write to ₹1,048.95, buyer
 *     pays ₹1,048.95, taxable ₹999.00
 */
export function orderTaxableValue(order: PayableOrderLike): number {
  const items = order.items;
  if (items?.length) {
    const raw = items.reduce((sum, i) => {
      const live = Math.max(0, i.quantity - (i.cancelledQuantity ?? 0));
      return sum + taxableFromInclusive(live * i.unitPrice, i.gstRate ?? 0);
    }, 0);
    return roundRupees(raw);
  }
  return taxableFromInclusive(
    (order.quantity ?? 0) * (order.unitPrice ?? 0),
    order.gstRate ?? 0,
  );
}

/** Sum of `orderTaxableValue` across orders — the payout base for a batch. */
export function ordersTaxableValue(orders: readonly PayableOrderLike[]): number {
  return roundRupees(orders.reduce((sum, o) => sum + orderTaxableValue(o), 0));
}

/**
 * The same base for lines with no order yet — a split capture is instructed
 * BEFORE the orders are created.
 */
export function linesTaxableValue(lines: readonly TaxableLineLike[]): number {
  return roundRupees(
    lines.reduce((sum, l) => sum + taxableFromInclusive(l.lineTotal, l.gstRate ?? 0), 0),
  );
}

/**
 * The three RATE fields a `payouts` row stores to explain its fee figures.
 *
 * 🛑 Rates, not percents: an admin types `5`, a row stores `0.05`, both are
 * bare numbers with no type between them, and swapping them bills a seller
 * 100× or 1/100×.
 */
export function commissionRecordRates(commissions: {
  platformFeePercent: number;
  gatewayFeePercent?: number;
  gstPercent: number;
}): { platformFeeRate: number; gatewayFeeRate: number; gstRate: number } {
  return {
    platformFeeRate: commissionPercentToRate(commissions.platformFeePercent),
    gatewayFeeRate: commissionPercentToRate(commissions.gatewayFeePercent),
    gstRate: commissionPercentToRate(commissions.gstPercent),
  };
}
