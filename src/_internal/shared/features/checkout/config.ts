export const CHECKOUT_DEFAULT_COMMISSIONS = {
  // Platform-commission rates. Previously absent here because no checkout path
  // computed a buyer-facing platform fee — the moment one did, a siteSettings
  // document that failed to load would have produced NaN fees rather than a
  // sane fallback. Mirrors the SiteSettingsDocument defaults.
  platformFeePercent: 5,
  gstPercent: 18,
  minimumTransactionFee: 0,
  platformFeeMax: 10,
  codDepositPercent: 10,
  codHandlingFeeMin: 200,
  codHandlingFeePercent: 10,
  whatsappNotifyFeeEnabled: false,
  whatsappNotifyFee: 10,
  giftWrapFeeEnabled: false,
  giftWrapFee: 49,
  shipmentProtectionFeeEnabled: false,
  shipmentProtectionFeePercent: 2,
  shipmentProtectionFeeMin: 30,
  sellerShippingFixed: 50,
  platformShippingPercent: 10,
  platformShippingFixedMin: 50,
} as const;

export const CHECKOUT_PAYMENT_METHODS = ["cash", "cod", "online", "upi_manual", "admin_bypass", "emi"] as const;
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
