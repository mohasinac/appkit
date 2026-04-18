/**
 * Checkout Feature Firestore Document Types & Constants
 * Covers: failed checkouts, failed payments
 */

export type FailedCheckoutReason =
  | "otp_not_verified"
  | "consent_expired"
  | "stock_failed"
  | "address_not_found"
  | "cart_empty"
  | "validation_error"
  | "unknown";

export type FailedPaymentReason =
  | "signature_mismatch"
  | "payment_cancelled"
  | "amount_mismatch"
  | "otp_not_verified"
  | "consent_expired"
  | "product_unavailable"
  | "stock_insufficient"
  | "unknown";

export interface FailedCheckoutDocument {
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

export interface FailedPaymentDocument {
  id: string;
  uid: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  /** Amount in smallest currency unit (e.g. paise). */
  amountRs?: number;
  addressId?: string;
  reason: FailedPaymentReason;
  /** Raw error message for ops. */
  detail?: string;
  createdAt: Date;
}

export const FAILED_CHECKOUTS_COLLECTION = "failedCheckouts" as const;
export const FAILED_PAYMENTS_COLLECTION = "failedPayments" as const;
