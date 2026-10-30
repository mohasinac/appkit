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
  saleProtectionFeeEnabled?: boolean;
  saleProtectionFeePercent?: number;
  saleProtectionFeeMin?: number;
  codHandlingFeeCap?: number;
  codHandlingFeePercent?: number;
  codDepositPercent?: number;

  /*
   * ── The four rates that PRICE WHAT THE BUYER IS CHARGED (added 2026-10-22) ──
   *
   * 🛑 These were withheld, and withholding them was the defect. A buyer saw
   * `Platform fee ₹10.00` and `GST on platform fee ₹1.80` as bare numbers with
   * no way to check either — four figures to be taken on trust, on the screen
   * where they decide whether to pay. "Show them properly why and how much is
   * the charges" is the owner's instruction, and a derivation cannot be shown
   * without the rate that produced it.
   *
   * The line the projection draws is unchanged in substance: a rate the BUYER
   * PAYS is buyer-facing; a rate that describes what we keep, what we pay a
   * gateway, or when we settle a seller is not. All eleven of those stay
   * withheld (see below), and so does `surchargeSellerSharePercent`, which is
   * excluded structurally by `BuyerEmiSettings` rather than by this list.
   */
  /** Commission rate applied to the cart subtotal, before the cap. */
  platformFeePercent?: number;
  /** Rupee ceiling on the commission — the reason a ₹39,500 order pays ₹10. */
  platformFeeMax?: number;
  /** GST rate levied on the commission actually charged (never on the uncapped figure). */
  gstPercent?: number;
  /** Rupee floor on `platformFee + gstOnFee` combined. */
  minimumTransactionFee?: number;
}

/**
 * Withheld on purpose (11 of 25): gatewayFeePercent, sellerShippingFixed,
 * platformShippingPercent, platformShippingFixedMin, autoPayoutWindowDays,
 * payoutHoldDays, minPayoutAmount, collectorDropListingFee, preOrderListingFee,
 * featuredSlotFee, promotedSlotFee — plus `surchargeSellerSharePercent`, which
 * lives on the EMI block and is excluded by `BuyerEmiSettings` below.
 *
 * Every one of those prices something between us and a seller or a gateway.
 * None of them changes what the buyer is asked to pay, so none of them has a
 * reader in a browser.
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
    saleProtectionFeeEnabled: commissions.saleProtectionFeeEnabled,
    saleProtectionFeePercent: commissions.saleProtectionFeePercent,
    saleProtectionFeeMin: commissions.saleProtectionFeeMin,
    codHandlingFeeCap: commissions.codHandlingFeeCap,
    codHandlingFeePercent: commissions.codHandlingFeePercent,
    codDepositPercent: commissions.codDepositPercent,
    platformFeePercent: commissions.platformFeePercent,
    platformFeeMax: commissions.platformFeeMax,
    gstPercent: commissions.gstPercent,
    minimumTransactionFee: commissions.minimumTransactionFee,
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
