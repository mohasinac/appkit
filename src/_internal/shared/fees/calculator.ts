/**
 * Shared fee calculator — single source of truth for platform commission,
 * gateway fee, GST, and COD handling fee math. Replaces the ~5 duplicated
 * (and in the payout case, inconsistent) formulas that used to live
 * separately in checkout actions, refund actions, and the two payout
 * eligibility jobs.
 *
 * Two distinct fee shapes:
 *  - `computeCheckoutFees` — what the BUYER pays on top of the subtotal
 *    (platform fee + GST on that fee). The gateway fee is absorbed by the
 *    platform, never passed through to the buyer.
 *  - `computePayoutDeduction` — what's deducted from the SELLER's payout
 *    (platform fee + gateway fee + GST on the platform fee).
 *
 * All money amounts are in decimal rupees.
 */

import { roundRupees } from "../../../utils/number.formatter";

export interface FeeCommissionRates {
  platformFeePercent: number;
  gstPercent: number;
  /** Rupee floor (not paise) — matches the existing `minimumTransactionFee` doc convention. */ // audit-money-units-ok: clarifies this is NOT paise
  minimumTransactionFee?: number;
  /**
   * Rupee ceiling on the buyer-facing platform commission. Optional so
   * siteSettings documents saved before this field existed keep working —
   * falls back to DEFAULT_PLATFORM_FEE_MAX (₹10).
   *
   * Applies to `computeCheckoutFees` (what the BUYER pays) only. The seller-side
   * `computePayoutDeduction` is deliberately uncapped — that is a separate
   * commercial decision, not the same number.
   */ // audit-money-units-ok: rupee ceiling, not paise
  platformFeeMax?: number;
  gatewayFeePercent?: number;
}

/** Buyer-facing platform commission ceiling, in decimal rupees. */
const DEFAULT_PLATFORM_FEE_MAX = 10;

export interface CheckoutFees {
  /** Platform commission in decimal rupees, capped at `platformFeeMax`. */
  platformFee: number;
  /** GST on the (already capped) platform fee, in decimal rupees. */
  gstOnFee: number;
  /** platformFee + gstOnFee, floored at minimumTransactionFee. */
  totalFee: number;
}

/**
 * What the buyer pays on top of the subtotal.
 *
 * The cap is applied to the commission BEFORE GST is computed, because GST is
 * levied on the commission actually charged — capping afterwards would bill tax
 * on money that was never collected.
 */
export function computeCheckoutFees(subtotal: number, commissions: FeeCommissionRates): CheckoutFees {
  const uncapped = roundRupees(subtotal * (commissions.platformFeePercent / 100));
  const cap = commissions.platformFeeMax ?? DEFAULT_PLATFORM_FEE_MAX;
  const platformFee = Math.min(uncapped, cap);
  const gstOnFee = roundRupees(platformFee * (commissions.gstPercent / 100));
  const totalFee = Math.max(platformFee + gstOnFee, commissions.minimumTransactionFee ?? 0);
  return { platformFee, gstOnFee, totalFee };
}

/**
 * Split one checkout's platform commission across the orders it produces.
 *
 * The buyer is charged a single capped commission for the transaction, but the
 * cart splits into one order per store, and each `OrderDocument` records its own
 * `platformFee` (invoices, reconciliation). Apportioning pro-rata by group
 * subtotal keeps those per-order figures meaningful; giving the last group the
 * rounding remainder guarantees they sum to exactly what was charged, so the
 * orders can never quietly total a rupee more or less than the buyer paid.
 *
 * @param groupSubtotals `[storeId, subtotal]` pairs, in stable order.
 */
export function allocateCheckoutFees(
  groupSubtotals: readonly (readonly [string, number])[],
  fees: CheckoutFees,
): Map<string, { platformFee: number; gstOnFee: number }> {
  const allocation = new Map<string, { platformFee: number; gstOnFee: number }>();
  if (groupSubtotals.length === 0) return allocation;

  const total = groupSubtotals.reduce((sum, [, subtotal]) => sum + subtotal, 0);
  let platformRemaining = fees.platformFee;
  let gstRemaining = fees.gstOnFee;

  groupSubtotals.forEach(([storeId, subtotal], index) => {
    const isLast = index === groupSubtotals.length - 1;
    // An all-zero cart can't be apportioned by share — fall back to giving the
    // whole (necessarily zero-ish) fee to the last group rather than dividing
    // by zero.
    const share = total > 0 ? subtotal / total : 0;
    const platformFee = isLast ? roundRupees(platformRemaining) : roundRupees(fees.platformFee * share);
    const gstOnFee = isLast ? roundRupees(gstRemaining) : roundRupees(fees.gstOnFee * share);
    platformRemaining = roundRupees(platformRemaining - platformFee);
    gstRemaining = roundRupees(gstRemaining - gstOnFee);
    allocation.set(storeId, { platformFee, gstOnFee });
  });

  return allocation;
}

export interface PayoutDeduction {
  /** Platform commission in decimal rupees. */
  platformFee: number;
  /** Payment gateway cost, absorbed by the platform from the seller's share, in decimal rupees. */
  gatewayFee: number;
  /** GST on the platform fee, in decimal rupees. */
  gstOnFee: number;
  /** platformFee + gatewayFee + gstOnFee. */
  totalDeduction: number;
  /** grossAmount - totalDeduction, floored at 0. */
  netAmount: number;
}

export function computePayoutDeduction(grossAmount: number, commissions: FeeCommissionRates): PayoutDeduction {
  const platformFee = roundRupees(grossAmount * (commissions.platformFeePercent / 100));
  const gatewayFee = roundRupees(grossAmount * ((commissions.gatewayFeePercent ?? 0) / 100));
  const gstOnFee = roundRupees(platformFee * (commissions.gstPercent / 100));
  const totalDeduction = roundRupees(platformFee + gatewayFee + gstOnFee);
  const netAmount = Math.max(0, roundRupees(grossAmount - totalDeduction));
  return { platformFee, gatewayFee, gstOnFee, totalDeduction, netAmount };
}

export interface CodHandlingFeeRates {
  /** Optional so existing `siteSettings` documents saved before this field existed don't produce NaN — falls back to ₹200. */
  codHandlingFeeMin?: number;
  /** Optional for the same reason — falls back to 10%. */
  codHandlingFeePercent?: number;
}

const DEFAULT_COD_HANDLING_FEE_MIN = 200;
const DEFAULT_COD_HANDLING_FEE_PERCENT = 10;

/** COD handling fee charged to the buyer: max(fixed floor, subtotal × percent). */
export function computeCodHandlingFee(subtotal: number, rates: CodHandlingFeeRates): number {
  const min = rates.codHandlingFeeMin ?? DEFAULT_COD_HANDLING_FEE_MIN;
  const percent = rates.codHandlingFeePercent ?? DEFAULT_COD_HANDLING_FEE_PERCENT;
  const percentFee = roundRupees(subtotal * (percent / 100));
  return Math.max(min, percentFee);
}

export interface WhatsAppNotifyFeeRates {
  /** Admin master toggle — the addon isn't charged (even if the buyer selected it) unless this is true. */
  whatsappNotifyFeeEnabled?: boolean;
  /** Flat rupee fee charged when the buyer opts in. Falls back to ₹10. */
  whatsappNotifyFee?: number;
}

const DEFAULT_WHATSAPP_NOTIFY_FEE = 10;

/** Flat WhatsApp order-updates addon fee — charged only when the buyer opted in AND the admin has the addon enabled. */
export function computeWhatsAppNotifyFee(addonSelected: boolean, rates: WhatsAppNotifyFeeRates): number {
  if (!addonSelected || !rates.whatsappNotifyFeeEnabled) return 0;
  return rates.whatsappNotifyFee ?? DEFAULT_WHATSAPP_NOTIFY_FEE;
}

export interface GiftWrapFeeRates {
  /** Admin master toggle — the addon isn't charged (even if the buyer selected it) unless this is true. */
  giftWrapFeeEnabled?: boolean;
  /** Flat rupee fee charged when the buyer opts in. Falls back to ₹49. */
  giftWrapFee?: number;
}

const DEFAULT_GIFT_WRAP_FEE = 49;

/** Flat gift-wrap addon fee — charged only when the buyer opted in AND the admin has the addon enabled. */
export function computeGiftWrapFee(addonSelected: boolean, rates: GiftWrapFeeRates): number {
  if (!addonSelected || !rates.giftWrapFeeEnabled) return 0;
  return rates.giftWrapFee ?? DEFAULT_GIFT_WRAP_FEE;
}

export interface ShipmentProtectionFeeRates {
  /** Admin master toggle — the addon isn't charged (even if the buyer selected it) unless this is true. */
  shipmentProtectionFeeEnabled?: boolean;
  /** Percent of subtotal. Falls back to 2%. */
  shipmentProtectionFeePercent?: number;
  /** Rupee floor. Falls back to ₹30. */
  shipmentProtectionFeeMin?: number;
}

const DEFAULT_SHIPMENT_PROTECTION_FEE_PERCENT = 2;
const DEFAULT_SHIPMENT_PROTECTION_FEE_MIN = 30;

/** Shipment-protection addon fee: max(fixed floor, subtotal × percent) — charged only when the buyer opted in AND the admin has the addon enabled. */
export function computeShipmentProtectionFee(subtotal: number, addonSelected: boolean, rates: ShipmentProtectionFeeRates): number {
  if (!addonSelected || !rates.shipmentProtectionFeeEnabled) return 0;
  const percent = rates.shipmentProtectionFeePercent ?? DEFAULT_SHIPMENT_PROTECTION_FEE_PERCENT;
  const min = rates.shipmentProtectionFeeMin ?? DEFAULT_SHIPMENT_PROTECTION_FEE_MIN;
  const percentFee = roundRupees(subtotal * (percent / 100));
  return Math.max(min, percentFee);
}

/**
 * P-8 GST — buyer-facing product tax, distinct from the platform-commission
 * GST above. Intra-state orders split the rate evenly between CGST + SGST;
 * inter-state orders charge the full rate as IGST. All amounts in decimal rupees.
 */
export interface GstBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstAmount: number;
}

export function calculateGst(
  rate: number,
  intraState: boolean,
  taxableAmount: number,
): GstBreakdown {
  const gstAmount = roundRupees(taxableAmount * (rate / 100));
  if (intraState) {
    const half = roundRupees(gstAmount / 2);
    return { taxableAmount, cgst: half, sgst: half, igst: 0, gstAmount: roundRupees(half * 2) };
  }
  return { taxableAmount, cgst: 0, sgst: 0, igst: gstAmount, gstAmount };
}
