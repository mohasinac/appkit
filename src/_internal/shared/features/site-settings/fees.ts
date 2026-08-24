/**
 * Buyer-facing projections of `siteSettings.commissions` / `siteSettings.emi`.
 *
 * The commissions block holds 25 fields, most of which describe internal
 * economics — `gatewayFeePercent`, `sellerShippingFixed`,
 * `platformShippingPercent`, `payoutHoldDays`, `minPayoutAmount`,
 * `autoPayoutWindowDays`, and the listing/featured/promoted slot fees. Ten of
 * them price something the buyer actually chooses, and only those ten belong
 * in a browser.
 *
 * Why a projection rather than a type: the cart and checkout client props were
 * ALREADY typed narrowly (`StoreAddonsRates`, `CodHandlingFeeRates & …`), but
 * the SSR pages passed `settings.commissions` whole. TypeScript's structural
 * typing accepts a wider object without complaint, so every one of the 25
 * fields was serialised into the page's HTML regardless of what the prop type
 * said. A type alone cannot strip fields at runtime — this function can.
 *
 * Use this for BOTH the cart/checkout SSR props and any future public API that
 * needs fee data, so there is exactly one definition of "buyer-facing fee".
 */
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";
import type { EmiSettings } from "../emi/schedule";

/**
 * = `StoreAddonsRates` ∪ `CodHandlingFeeRates` ∪ `{ codDepositPercent }` —
 * the union of what `StoreAddonsPicker` and the checkout COD block read.
 * Every field is optional because older `siteSettings` documents predate them
 * and each `compute*Fee` helper carries its own default.
 */
export interface BuyerFacingFees {
  whatsappNotifyFeeEnabled?: boolean;
  whatsappNotifyFee?: number;
  giftWrapFeeEnabled?: boolean;
  giftWrapFee?: number;
  shipmentProtectionFeeEnabled?: boolean;
  shipmentProtectionFeePercent?: number;
  shipmentProtectionFeeMin?: number;
  codHandlingFeeMin?: number;
  codHandlingFeePercent?: number;
  codDepositPercent?: number;
}

/**
 * Withheld on purpose (15 of 25): platformFeePercent, gstPercent,
 * minimumTransactionFee, platformFeeMax, gatewayFeePercent,
 * sellerShippingFixed, platformShippingPercent, platformShippingFixedMin,
 * autoPayoutWindowDays, payoutHoldDays, minPayoutAmount, auctionListingFee,
 * preOrderListingFee, featuredSlotFee, promotedSlotFee.
 *
 * The buyer still SEES the platform fee and GST — as computed amounts in the
 * server pricing preview (`CartPriceBreakdownData`), never as the rates that
 * produced them.
 */
export function toBuyerFacingFees(
  commissions: SiteSettingsDocument["commissions"] | null | undefined,
): BuyerFacingFees | null {
  if (!commissions) return null;
  return {
    whatsappNotifyFeeEnabled: commissions.whatsappNotifyFeeEnabled,
    whatsappNotifyFee: commissions.whatsappNotifyFee,
    giftWrapFeeEnabled: commissions.giftWrapFeeEnabled,
    giftWrapFee: commissions.giftWrapFee,
    shipmentProtectionFeeEnabled: commissions.shipmentProtectionFeeEnabled,
    shipmentProtectionFeePercent: commissions.shipmentProtectionFeePercent,
    shipmentProtectionFeeMin: commissions.shipmentProtectionFeeMin,
    codHandlingFeeMin: commissions.codHandlingFeeMin,
    codHandlingFeePercent: commissions.codHandlingFeePercent,
    codDepositPercent: commissions.codDepositPercent,
  };
}

/**
 * EMI settings minus `surchargeSellerSharePercent` — how the surcharge is
 * split between platform and seller is a commercial term, not something the
 * buyer's browser needs. Pair with `computeBuyerEmiQuote`, which is typed to
 * accept exactly this shape.
 */
export type BuyerEmiSettings = Omit<EmiSettings, "surchargeSellerSharePercent">;

export function toBuyerEmiSettings(
  emi: SiteSettingsDocument["emi"] | null | undefined,
): BuyerEmiSettings | null {
  if (!emi) return null;
  return {
    enabled: emi.enabled,
    minOrderValue: emi.minOrderValue,
    tenureOptions: emi.tenureOptions,
    tokenPercent: emi.tokenPercent,
    billingDay: emi.billingDay,
    surchargePercentPerMonth: emi.surchargePercentPerMonth,
  };
}
