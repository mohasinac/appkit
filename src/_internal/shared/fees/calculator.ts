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
 * All money amounts are in paise (integer).
 */

export interface FeeCommissionRates {
  platformFeePercent: number;
  gstPercent: number;
  /** Rupee floor (not paise) — matches the existing `minimumTransactionFee` doc convention. */
  minimumTransactionFee?: number;
  gatewayFeePercent?: number;
}

export interface CheckoutFees {
  /** Platform commission in paise. */
  platformFee: number;
  /** GST on the platform fee, in paise. */
  gstOnFee: number;
  /** platformFee + gstOnFee, floored at minimumTransactionFee. */
  totalFee: number;
}

export function computeCheckoutFees(subtotal: number, commissions: FeeCommissionRates): CheckoutFees {
  const platformFee = Math.round(subtotal * (commissions.platformFeePercent / 100));
  const gstOnFee = Math.round(platformFee * (commissions.gstPercent / 100));
  const minimumTransactionFeeInPaise = Math.round((commissions.minimumTransactionFee ?? 0) * 100);
  const totalFee = Math.max(platformFee + gstOnFee, minimumTransactionFeeInPaise);
  return { platformFee, gstOnFee, totalFee };
}

export interface PayoutDeduction {
  /** Platform commission in paise. */
  platformFee: number;
  /** Payment gateway cost, absorbed by the platform from the seller's share, in paise. */
  gatewayFee: number;
  /** GST on the platform fee, in paise. */
  gstOnFee: number;
  /** platformFee + gatewayFee + gstOnFee. */
  totalDeduction: number;
  /** grossAmount - totalDeduction, floored at 0. */
  netAmount: number;
}

export function computePayoutDeduction(grossAmount: number, commissions: FeeCommissionRates): PayoutDeduction {
  const platformFee = Math.round(grossAmount * (commissions.platformFeePercent / 100));
  const gatewayFee = Math.round(grossAmount * ((commissions.gatewayFeePercent ?? 0) / 100));
  const gstOnFee = Math.round(platformFee * (commissions.gstPercent / 100));
  const totalDeduction = platformFee + gatewayFee + gstOnFee;
  const netAmount = Math.max(0, grossAmount - totalDeduction);
  return { platformFee, gatewayFee, gstOnFee, totalDeduction, netAmount };
}

export interface CodHandlingFeeRates {
  /** Optional so existing `siteSettings` documents saved before this field existed don't produce NaN — falls back to ₹200 (20000 paise). */
  codHandlingFeeMinInPaise?: number;
  /** Optional for the same reason — falls back to 10%. */
  codHandlingFeePercent?: number;
}

const DEFAULT_COD_HANDLING_FEE_MIN_IN_PAISE = 20000;
const DEFAULT_COD_HANDLING_FEE_PERCENT = 10;

/** COD handling fee charged to the buyer: max(fixed floor, subtotal × percent). */
export function computeCodHandlingFee(subtotal: number, rates: CodHandlingFeeRates): number {
  const minInPaise = rates.codHandlingFeeMinInPaise ?? DEFAULT_COD_HANDLING_FEE_MIN_IN_PAISE;
  const percent = rates.codHandlingFeePercent ?? DEFAULT_COD_HANDLING_FEE_PERCENT;
  const percentFee = Math.round(subtotal * (percent / 100));
  return Math.max(minInPaise, percentFee);
}

/**
 * P-8 GST — buyer-facing product tax, distinct from the platform-commission
 * GST above. Intra-state orders split the rate evenly between CGST + SGST;
 * inter-state orders charge the full rate as IGST. All amounts in paise.
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
  taxableAmountInPaise: number,
): GstBreakdown {
  const gstAmount = Math.round(taxableAmountInPaise * (rate / 100));
  if (intraState) {
    const half = Math.round(gstAmount / 2);
    return { taxableAmount: taxableAmountInPaise, cgst: half, sgst: half, igst: 0, gstAmount: half * 2 };
  }
  return { taxableAmount: taxableAmountInPaise, cgst: 0, sgst: 0, igst: gstAmount, gstAmount };
}
