import { siteSettingsRepository } from "../../../../repositories";
import {
  PAYMENTS_DEFAULT_PLATFORM_FEE_PERCENT,
  PAYMENTS_DEFAULT_GST_PERCENT,
} from "../../../shared/features/payments/config";

export interface ResolvedPaymentFee {
  baseAmount: number;
  platformFee: number;
  gstOnFee: number;
  totalAmount: number;
}

/**
 * Inflates the cart total by our platform fee + GST on that fee.
 * platformFeePercent = siteSettings.commissions.platformFeePercent (our cut %).
 * gstPercent = siteSettings.commissions.gstPercent (18% GST on our fee, not on full order).
 * minimumTransactionFee = per-gateway-transaction floor in rupees.
 */
export async function resolvePaymentFee(baseAmount: number): Promise<ResolvedPaymentFee> {
  const siteSettings = await siteSettingsRepository.getSingleton();
  const platformFeePercent =
    siteSettings?.commissions?.platformFeePercent ?? PAYMENTS_DEFAULT_PLATFORM_FEE_PERCENT;
  const gstPercent =
    siteSettings?.commissions?.gstPercent ?? PAYMENTS_DEFAULT_GST_PERCENT;
  const minimumTransactionFee =
    Math.max(0, siteSettings?.commissions?.minimumTransactionFee ?? 0);

  const platformFee = Math.round(baseAmount * (platformFeePercent / 100) * 100) / 100;
  const gstOnFee = Math.round(platformFee * (gstPercent / 100) * 100) / 100;
  const rawTotal = baseAmount + platformFee + gstOnFee;
  const totalAmount = Math.max(rawTotal, baseAmount + minimumTransactionFee);
  return { baseAmount, platformFee, gstOnFee, totalAmount };
}
