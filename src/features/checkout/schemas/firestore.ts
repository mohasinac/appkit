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

/**
 * The durable buyer-policy consent record (item 1.39).
 *
 * 🛑 This collection is the AUDIT TRAIL, and it exists separately from the
 * copy stamped on each order for one reason: on the online-gateway path the
 * consent is taken BEFORE the money moves (at `POST /api/payment/create-order`)
 * and the order does not exist yet. A record that only lived on the order
 * could therefore only ever be written AFTER capture — i.e. it could not be
 * the thing that authorised the capture.
 *
 * Written once, never updated. An amended consent is a NEW record.
 */
export interface BuyerPolicyConsentDocument {
  id: string;
  /** The buyer who ticked the box. */
  uid: string;
  /** `siteSettings.checkoutPolicies.version` in force at the time. */
  version: number;
  /** `sha256` over the canonicalised clause list, hex. */
  hash: string;
  /** Verbatim text as shown. Never a pointer to current settings. */
  clauses: { id: string; text: string }[];
  /** Which path captured it — see `OrderPolicyConsent.capturedOn`. */
  capturedOn: "checkout" | "gateway-create-order" | "admin-bypass";
  acceptedAt: Date;
  /**
   * Set once the consent has been attached to at least one order. Purely
   * diagnostic: a record with no order ids after a gateway create-order is a
   * checkout the buyer abandoned, which is a normal and uninteresting state —
   * but one with a captured payment and no order ids is the 2026-10-21 shape.
   */
  orderIds?: string[];
}

export const BUYER_POLICY_CONSENTS_COLLECTION = "buyerPolicyConsents" as const;
