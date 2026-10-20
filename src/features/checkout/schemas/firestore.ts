/**
 * Checkout Feature Firestore Document Types & Constants
 * Covers: failed checkouts, failed payments
 */

export type FailedCheckoutReason =
  | "stock_failed"
  | "address_not_found"
  | "cart_empty"
  /**
   * The cart exceeded `siteSettings.payment.codMaxOrderValue` and COD was
   * refused server-side.
   *
   * 🛑 Its own reason rather than `validation_error`, because it is the only
   * one here that is a BUSINESS rule an admin can change rather than a
   * malformed request. Folded into `validation_error` it would be invisible,
   * and "how often does the COD cap turn buyers away" is the question that
   * decides whether ₹3,000 is the right number.
   */
  | "cod_over_limit"
  | "validation_error"
  | "unknown";

export type FailedPaymentReason =
  | "signature_mismatch"
  | "payment_cancelled"
  | "amount_mismatch"
  | "product_unavailable"
  | "stock_insufficient"
  | "unknown";

export type FailedCheckoutDocument = {
  id: string;
  uid: string;
  addressId?: string;
  paymentMethod?: string;
  cartTotal?: number;
  cartItemCount?: number;
  reason: FailedCheckoutReason;
  /** Raw error message for ops — not shown to buyers. */
  detail?: string;
  createdAt: Date;
}

export type FailedPaymentDocument = {
  id: string;
  uid: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  /** Amount in decimal rupees. */
  amountRs?: number;
  addressId?: string;
  reason: FailedPaymentReason;
  /** Raw error message for ops. */
  detail?: string;
  createdAt: Date;
}

export const FAILED_CHECKOUTS_COLLECTION = "failedCheckouts" as const;
export const FAILED_PAYMENTS_COLLECTION = "failedPayments" as const;
