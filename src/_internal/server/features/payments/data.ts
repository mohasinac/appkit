import { siteSettingsRepository } from "../../../../repositories";
import { PAYMENTS_DEFAULT_RAZORPAY_FEE_PERCENT } from "../../../shared/features/payments/config";

export interface ResolvedPaymentFee {
  baseAmount: number;
  platformFee: number;
  totalAmount: number;
}

/**
 * Returns the cart total inflated by the configured Razorpay processing fee.
 * The percent comes from siteSettings.commissions.razorpayFeePercent and
 * falls back to the default if unset.
 */
export async function resolvePaymentFee(baseAmount: number): Promise<ResolvedPaymentFee> {
  const siteSettings = await siteSettingsRepository.getSingleton();
  const razorpayFeePercent =
    siteSettings?.commissions?.razorpayFeePercent ?? PAYMENTS_DEFAULT_RAZORPAY_FEE_PERCENT;
  const platformFee = Math.round(baseAmount * (razorpayFeePercent / 100) * 100) / 100;
  const totalAmount = baseAmount + platformFee;
  return { baseAmount, platformFee, totalAmount };
}
