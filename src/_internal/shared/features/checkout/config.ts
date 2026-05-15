export const CHECKOUT_DEFAULT_COMMISSIONS = {
  codDepositPercent: 10,
  sellerShippingFixed: 50,
  platformShippingPercent: 10,
  platformShippingFixedMin: 50,
} as const;

export const CHECKOUT_PAYMENT_METHODS = ["cod", "online", "upi_manual", "admin_bypass"] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];
