import {
  DEFAULT_PLATFORM_FEE_PER_UNIT_FLOOR,
  DEFAULT_PLATFORM_FEE_UNIT_BANDS,
} from "../../fees/calculator";

export const CHECKOUT_DEFAULT_COMMISSIONS = {
  // Platform-commission rates. Previously absent here because no checkout path
  // computed a buyer-facing platform fee — the moment one did, a siteSettings
  // document that failed to load would have produced NaN fees rather than a
  // sane fallback. Mirrors the SiteSettingsDocument defaults.
  platformFeePercent: 5,
  gstPercent: 18,
  minimumTransactionFee: 0,
  /*
   * 🛑 NOT the buyer-facing model any more. `platformFeeMax` was the ceiling on
   * the old percentage commission, and `computeCheckoutFees` no longer reads
   * either of them — the buyer pays `platformFeePerListingUnit × units`
   * (owner, 2026-11-08). Both are kept here because `siteSettings.commissions`
   * still stores them and `computePayoutDeduction` still charges the SELLER a
   * percentage, which was never the same number.
   */
  platformFeeMax: 10,
  /*
   * The buyer-facing platform fee: a TAPERED per-unit rate with a hard floor,
   * plus `gstPercent` on the fee. Owner, 2026-11-08 — a single line with
   * quantity 3 is ₹30, and *"if you buy more the fees reduces as you go up,
   * but never less than 5 rs"*. A composite listing is ONE unit (the BX-53
   * ruling), so the count is `item.quantity`, never its component count.
   *
   * 🛑 Mirrors `DEFAULT_PLATFORM_FEE_UNIT_BANDS` / `_PER_UNIT_FLOOR` rather
   * than restating them: this object is only reached when the settings read
   * FAILS, and a fallback that disagreed with the live default would make an
   * outage silently re-price every cart.
   */
  platformFeeUnitBands: DEFAULT_PLATFORM_FEE_UNIT_BANDS,
  platformFeePerUnitFloor: DEFAULT_PLATFORM_FEE_PER_UNIT_FLOOR,
  codDepositPercent: 10,
  codHandlingFeeCap: 200,
  codHandlingFeePercent: 10,
  // Mirrors the SiteSettingsDocument defaults, which enable every add-on.
  // Consequence of the mirror: if the settings read fails, an add-on already
  // ticked on the cart document is still billed rather than silently dropped.
  whatsappNotifyFeeEnabled: true,
  whatsappNotifyFee: 10,
  giftWrapFeeEnabled: true,
  giftWrapFee: 49,
  shipmentProtectionFeeEnabled: true,
  shipmentProtectionFeePercent: 2,
  shipmentProtectionFeeMin: 30,
  saleProtectionFeeEnabled: true,
  saleProtectionFeePercent: 3,
  saleProtectionFeeMin: 49,
  sellerShippingFixed: 50,
  platformShippingPercent: 10,
  platformShippingFixedMin: 50,
} as const;

/**
 * The methods checkout accepts.
 *
 * Owner, 2026-11-11: **gateway online + COD**. Two retired here:
 *
 * 🛑 `upi_manual` — a buyer paid a static VPA and uploaded a screenshot, which
 * nothing could verify. A screenshot is forgeable in a minute and a typed UTR
 * is an invented string; `payment-manual`'s own `listPayments()` returns `[]`
 * with a comment saying there is no ledger to compare against. Owner: *"that
 * is wrong to have."*
 *
 * ⚠ `emi` is ALSO retired (owner: now handled inside the payment gateways) but
 * is deliberately still listed here. Removing it from the type produced **10
 * compile errors across the checkout action and the checkout rules**, and
 * `actions.ts` alone carries ~160 EMI references — that is a money-path
 * refactor, not a list edit. Narrowing the type before the call sites are
 * rewritten would leave checkout uncompilable.
 *
 * The flag already stops it: `emi.enabled` ships `false` and
 * `checkEmiEligibility` returns `site_disabled`, so no new EMI order can be
 * created regardless of this list. Stage five removes the code behind that.
 *
 * ⚠ `cash` is NOT `cod`: it is cash on **pickup** (see `PAYMENT_METHOD_LABEL`),
 * a separate in-person flow, and it stays. `admin_bypass` is an operator tool
 * rather than a buyer-selectable method.
 *
 * ⚠ This list is still a closed `as const`, and §B of the plan replaces it
 * with the capability registry so a new method is a config row rather than a
 * deploy. Narrowing it is correct in the meantime — a method nobody can serve
 * should not be offerable — but it is not yet the end state.
 */
export const CHECKOUT_PAYMENT_METHODS = ["cash", "cod", "online", "admin_bypass", "emi"] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export const CHECKOUT_DEFAULT_EMI_SETTINGS = {
  enabled: false,
  /** ₹10,000 — a seller's cart subtotal must exceed this for EMI to appear. */
  minOrderValue: 10000,
  tenureOptions: [2, 3, 4, 5, 6],
  tokenPercent: 10,
  /** Day of the month (1–10) the first (and every) installment is due. */
  billingDay: 5,
  /** Extra % of principal per month of tenure — the buyer's cost for spreading payment. */
  surchargePercentPerMonth: 1,
  /** Share of the surcharge that goes to the seller; the rest is the platform's cut. */
  surchargeSellerSharePercent: 50,
} as const;
