/**
 * EMI (installment) eligibility + schedule computation — pure functions,
 * no I/O. Consumed by checkout (buyer-facing quote + order creation) and by
 * the seller/admin installment-collection UI (schedule display).
 *
 * Eligibility: a per-seller checkout group qualifies for EMI when the
 * site-wide flag, the seller's own opt-in, AND the subtotal threshold are
 * all satisfied — matching the existing COD deposit pattern of gating on
 * `siteSettings.payment.codEnabled`.
 *
 * Schedule: the buyer pays `tokenPercent`% up front (the "token"), then the
 * remaining principal plus a surcharge (the buyer's cost for spreading
 * payment across `tenureMonths`, split between platform and seller per
 * `surchargeSellerSharePercent`) across equal monthly installments, each
 * due on `billingDay` (1–10) of the month, starting the month after
 * purchase. All money amounts are in decimal rupees.
 */

import { roundRupees } from "../../../../utils/number.formatter";

export interface EmiSettings {
  enabled: boolean;
  minOrderValue: number;
  tenureOptions: readonly number[];
  tokenPercent: number;
  /** Day of month (1–10) each installment is due. */
  billingDay: number;
  surchargePercentPerMonth: number;
  surchargeSellerSharePercent: number;
}

export type EmiIneligibleReason = "site_disabled" | "seller_disabled" | "below_minimum" | "invalid_tenure";

export type EmiEligibility =
  | { eligible: true }
  | { eligible: false; reason: EmiIneligibleReason };

/**
 * `settings.enabled` is the site-wide toggle (`siteSettings.emi.enabled`).
 * `sellerEmiEnabled` is the seller's own opt-in (`StoreDocument.emiEnabled`).
 * Both must be true, in addition to the subtotal threshold.
 */
export function checkEmiEligibility(
  sellerSubtotal: number,
  sellerEmiEnabled: boolean,
  settings: Pick<EmiSettings, "enabled" | "minOrderValue">,
): EmiEligibility {
  if (!settings.enabled) return { eligible: false, reason: "site_disabled" };
  if (!sellerEmiEnabled) return { eligible: false, reason: "seller_disabled" };
  if (sellerSubtotal <= settings.minOrderValue) return { eligible: false, reason: "below_minimum" };
  return { eligible: true };
}

export interface EmiInstallmentPlan {
  index: number;
  dueDate: Date;
  /** Decimal rupees. */
  amount: number;
}

export interface EmiScheduleResult extends BuyerEmiQuote {
  surchargeSellerShare: number;
  surchargePlatformShare: number;
}

/**
 * The buyer-visible half of an EMI schedule — everything the checkout UI
 * renders, with the platform/seller surcharge split deliberately absent.
 *
 * This exists so the browser never needs `surchargeSellerSharePercent`, an
 * internal revenue-split figure. `computeEmiSchedule` below adds the split
 * back for the two server-side order-creation callers.
 */
export interface BuyerEmiQuote {
  /** Down payment collected at checkout, decimal rupees. */
  tokenAmount: number;
  /** Total surcharge across the whole tenure, decimal rupees. */
  surchargeAmount: number;
  installments: EmiInstallmentPlan[];
  /** Sum of all installment amounts — what's still owed after the token. */
  remainingBalance: number;
}

/**
 * `purchaseDate` defaults to now; the first installment always falls in the
 * calendar month AFTER purchase, regardless of which day of the current
 * month the purchase happens on.
 */
export function computeBuyerEmiQuote(
  sellerSubtotal: number,
  tenureMonths: number,
  settings: Pick<EmiSettings, "tokenPercent" | "billingDay" | "surchargePercentPerMonth">,
  purchaseDate: Date = new Date(),
): BuyerEmiQuote {
  const tokenAmount = roundRupees(sellerSubtotal * (settings.tokenPercent / 100));
  const principalRemaining = sellerSubtotal - tokenAmount;
  const surchargeAmount = roundRupees(
    principalRemaining * (settings.surchargePercentPerMonth / 100) * tenureMonths,
  );

  const totalToInstall = roundRupees(principalRemaining + surchargeAmount);
  const baseInstallment = roundRupees(Math.floor((totalToInstall / tenureMonths) * 100) / 100);
  const remainder = roundRupees(totalToInstall - baseInstallment * tenureMonths);

  const billingDay = Math.min(Math.max(settings.billingDay, 1), 10);
  const installments: EmiInstallmentPlan[] = [];
  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(
      Date.UTC(purchaseDate.getUTCFullYear(), purchaseDate.getUTCMonth() + i, billingDay),
    );
    // Last installment absorbs the rounding remainder so the sum is exact.
    const amount = i === tenureMonths ? baseInstallment + remainder : baseInstallment;
    installments.push({ index: i, dueDate, amount });
  }

  return {
    tokenAmount,
    surchargeAmount,
    installments,
    remainingBalance: totalToInstall,
  };
}

/**
 * Server-side schedule — the buyer quote plus the platform/seller surcharge
 * split. Order creation needs the split; the checkout UI does not, and must
 * use `computeBuyerEmiQuote` so `surchargeSellerSharePercent` never has to be
 * shipped to the browser.
 *
 * `surchargeSellerSharePercent` stays REQUIRED here on purpose: defaulting it
 * to 0 would let a server caller that forgot to pass it silently record a zero
 * seller share on a real order.
 */
export function computeEmiSchedule(
  sellerSubtotal: number,
  tenureMonths: number,
  settings: Pick<EmiSettings, "tokenPercent" | "billingDay" | "surchargePercentPerMonth" | "surchargeSellerSharePercent">,
  purchaseDate: Date = new Date(),
): EmiScheduleResult {
  const quote = computeBuyerEmiQuote(sellerSubtotal, tenureMonths, settings, purchaseDate);
  const surchargeSellerShare = roundRupees(
    quote.surchargeAmount * (settings.surchargeSellerSharePercent / 100),
  );
  return {
    ...quote,
    surchargeSellerShare,
    surchargePlatformShare: roundRupees(quote.surchargeAmount - surchargeSellerShare),
  };
}
