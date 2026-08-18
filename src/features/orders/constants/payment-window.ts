/**
 * 15-minute payment window shared constant — imported by the checkout action
 * (stamps `order.paymentDeadline`), the buyer countdown UI, and the
 * `paymentWindowTimeout` sweep job, so they can never drift out of sync.
 */
export const PAYMENT_WINDOW_MINUTES = 15;
export const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000;

/** Cancellation reasons this feature writes to `OrderDocument.cancellationReason` (a free-form string field). */
export const PAYMENT_WINDOW_EXPIRED_REASON = "payment_window_expired";
export const PAYMENT_FRAUD_REJECTED_REASON = "payment_fraud_rejected";
