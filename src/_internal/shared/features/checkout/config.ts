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
 * Owner, 2026-11-11, final: **ONLINE and COD, nothing else** — *"that cash
 * also can go, we only stick with online or cod which will be handled by the
 * shipment provider."* So COD collection rides the courier (Shiprocket or
 * equivalent) and settles back to us; there is no in-person tender left.
 *
 * Three methods retired, each for its own reason:
 *
 * 🛑 `upi_manual` — a buyer paid a static VPA and uploaded a screenshot, which
 * nothing could verify. A screenshot is forgeable in a minute and a typed UTR
 * is an invented string; the manual provider's own `listPayments()` returned
 * `[]` with a comment saying there was no ledger to compare against.
 *
 * 🛑 `cash` — cash on PICKUP. Not the same thing as `cod`, and it was briefly
 * kept on the grounds that counter pickup is a real flow. The owner's decision
 * removes it: an in-person tender nobody is staffed to collect is the same
 * unverifiable shape as `upi_manual`, one step further from a gateway.
 *
 * ⚠ `emi` — retired too (now handled inside the payment gateways), and its
 * modules and schema are already deleted. It stays in this list ONLY until the
 * consumer sweep finishes: `actions.ts` alone still carries ~66 references and
 * narrowing the type first leaves checkout uncompilable. `emi.enabled` ships
 * `false`, so nothing new can be created meanwhile.
 *
 * ⚠ `admin_bypass` is an operator tool, not a buyer-selectable method — it
 * exists so an admin can reach an order state without a real payment, is gated
 * on a permission, and logs every use.
 *
 * 🛑 REMOVING `cash` RETIRES THE 15-MINUTE PAYMENT WINDOW, which is not
 * obvious from this line. `hasPaymentWindow` in the checkout action is
 * `paymentMethod === CASH` and nothing else, so no order can be given a
 * `paymentDeadline` any more and `paymentWindowTimeout` has nothing to expire.
 *
 * ⚠ DO NOT delete that sweep on the strength of this. `runPaymentWindowTimeout`
 * carries TWO unrelated jobs riding along for cost reasons —
 * `reconcileStuckGatewayEvents` (webhook events we received and lost) and
 * `runDueJobRetries`. Deleting it would silently take out gateway-event
 * reconciliation, which is a money path. Strip its payment-window half and
 * keep the schedule.
 *
 * ⚠ This list is still a closed `as const`; §B replaces it with config-driven
 * resolution so a new method is a row rather than a deploy. Narrowing it is
 * right in the meantime — a method nobody can serve should not be offerable.
 */
export const CHECKOUT_PAYMENT_METHODS = ["cod", "online", "admin_bypass", "emi"] as const;
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
