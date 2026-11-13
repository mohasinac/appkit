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
  /**
   * The value up to which a parcel is covered for free.
   *
   * 🛑 PROJECTED BECAUSE THE BUYER IS TOLD THIS NUMBER. The three fee fields
   * above shipped here while the LIMIT did not, so `StoreAddonsPicker` had no
   * way to know it, its `autoCoverLimit` prop was never passed, and
   * `resolveAutoCover` read the missing value as 0 — rendering *"Orders above
   * ₹0 are not covered automatically"* while the server covered to ₹2,000.
   *
   * ⚠ A shown-vs-charged divergence on the money path, and the direction is
   * the bad one: the buyer is told they have LESS cover than they do, so they
   * buy protection they did not need. Found by reading the checkout screen,
   * not by any check — both halves were individually correct.
   */
  saleProtectionAutoCoverLimit?: number;
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
  /**
   * 🛑 NOT the buyer-facing model any more (2026-11-08). The platform fee is
   * `platformFeePerListingUnit × units`; this is the SELLER-side payout
   * commission and is projected only so a legacy settings document can still
   * be recognised. `explainPlatformFee` no longer reads it.
   */
  platformFeePercent?: number;
  /**
   * 🛑 DEAD FOR CHECKOUT. It was the ceiling on the percentage model, and a ₹10
   * ceiling on `n × ₹10` would cap every order at ₹10 — see
   * `FeeCommissionRates.platformFeeMax`.
   */
  platformFeeMax?: number;
  /**
   * The platform-fee VOLUME TAPER and its hard floor — owner, 2026-11-08.
   *
   * Buyer-facing by the same test as the rates above: the buyer pays it, so
   * the buyer may check it. `explainPlatformFee` prints the band a line
   * actually earned.
   *
   * 🛑 `toBuyerFacingFees` cannot project these yet: neither field exists on
   * `SiteSettingsDocument["commissions"]`, and that schema belongs to another
   * lane. Until it lands, the explainer is handed the per-line derivation the
   * SERVER computed (`CheckoutPricingPreview.platformFeeLines`) rather than
   * re-deriving it, so the explanation and the charge agree by construction
   * rather than by coincidence. Declared here now so the projection is a
   * two-line addition the day the schema fields exist.
   */
  platformFeeUnitBands?: readonly { minUnits: number; ratePerUnit: number }[];
  platformFeePerUnitFloor?: number;
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
    /* The limit the buyer is SHOWN — see the field's note for why its absence
       rendered "covered above ₹0" while the server covered to ₹2,000. */
    saleProtectionAutoCoverLimit: commissions.saleProtectionAutoCoverLimit,
    codHandlingFeeCap: commissions.codHandlingFeeCap,
    codHandlingFeePercent: commissions.codHandlingFeePercent,
    codDepositPercent: commissions.codDepositPercent,
    platformFeePercent: commissions.platformFeePercent,
    platformFeeMax: commissions.platformFeeMax,
    /*
     * The two-line addition this file's own comment promised: both fields now
     * exist on `SiteSettingsDocument["commissions"]`, so the taper can be
     * projected instead of being handed to the explainer by the server.
     *
     * ⚠ Still PUBLIC-SAFE, which is why they belong here rather than in the
     * withheld list. The taper is what the buyer is actually charged and what
     * the checkout explainer narrates — publishing it lets a buyer check the
     * arithmetic, which is the whole point of that surface. Nothing about
     * seller economics is exposed: `gatewayFeePercent`, the shipping splits
     * and the payout knobs stay withheld.
     *
     * 🛑 Projected as a COPY, not the stored reference. These objects cross
     * into a client payload, and handing out the array the settings cache
     * holds means any consumer that sorts or mutates it corrupts the cached
     * singleton for every later reader in the same process.
     */
    platformFeeUnitBands: commissions.platformFeeUnitBands?.map((b) => ({
      minUnits: b.minUnits,
      ratePerUnit: b.ratePerUnit,
    })),
    platformFeePerUnitFloor: commissions.platformFeePerUnitFloor,
    gstPercent: commissions.gstPercent,
    minimumTransactionFee: commissions.minimumTransactionFee,
  };
}

/*
 * 🛑 `BuyerEmiSettings` + `toBuyerEmiSettings` removed with EMI stage 5 —
 * `_internal/shared/features/emi/` (choice · group · schedule) is deleted, so
 * `EmiSettings` no longer exists to project from.
 */
