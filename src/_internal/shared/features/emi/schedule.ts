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
 * purchase. All money amounts are in paise (integer).
 */

export interface EmiSettings {
  enabled: boolean;
  minOrderValueInPaise: number;
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
  settings: Pick<EmiSettings, "enabled" | "minOrderValueInPaise">,
): EmiEligibility {
  if (!settings.enabled) return { eligible: false, reason: "site_disabled" };
  if (!sellerEmiEnabled) return { eligible: false, reason: "seller_disabled" };
  if (sellerSubtotal <= settings.minOrderValueInPaise) return { eligible: false, reason: "below_minimum" };
  return { eligible: true };
}

export interface EmiInstallmentPlan {
  index: number;
  dueDate: Date;
  /** Paise. */
  amount: number;
}

export interface EmiScheduleResult {
  /** Down payment collected at checkout, in paise. */
  tokenAmount: number;
  /** Total surcharge across the whole tenure, in paise. */
  surchargeAmount: number;
  surchargeSellerShare: number;
  surchargePlatformShare: number;
  installments: EmiInstallmentPlan[];
  /** Sum of all installment amounts — what's still owed after the token. */
  remainingBalance: number;
}

/**
 * `purchaseDate` defaults to now; the first installment always falls in the
 * calendar month AFTER purchase, regardless of which day of the current
 * month the purchase happens on.
 */
export function computeEmiSchedule(
  sellerSubtotal: number,
  tenureMonths: number,
  settings: Pick<EmiSettings, "tokenPercent" | "billingDay" | "surchargePercentPerMonth" | "surchargeSellerSharePercent">,
  purchaseDate: Date = new Date(),
): EmiScheduleResult {
  const tokenAmount = Math.round(sellerSubtotal * (settings.tokenPercent / 100));
  const principalRemaining = sellerSubtotal - tokenAmount;
  const surchargeAmount = Math.round(
    principalRemaining * (settings.surchargePercentPerMonth / 100) * tenureMonths,
  );
  const surchargeSellerShare = Math.round(surchargeAmount * (settings.surchargeSellerSharePercent / 100));
  const surchargePlatformShare = surchargeAmount - surchargeSellerShare;

  const totalToInstall = principalRemaining + surchargeAmount;
  const baseInstallment = Math.floor(totalToInstall / tenureMonths);
  const remainder = totalToInstall - baseInstallment * tenureMonths;

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
    surchargeSellerShare,
    surchargePlatformShare,
    installments,
    remainingBalance: totalToInstall,
  };
}
