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

/**
 * The `paymentMethod` values that settle out-of-band and therefore require a
 * buyer-uploaded proof + a human review pass. Single source of truth for
 * `attachPaymentProofAction`'s guard, the admin payment-review queue, and the
 * buyer/seller "needs payment proof" UI — previously each site inlined its own
 * `pm !== "cash" && pm !== "upi_manual" && ...` chain and they could drift.
 */
export const MANUAL_PAYMENT_METHODS: readonly string[] = ["cash", "upi_manual", "emi"];

export function isManualPaymentMethod(method: string | undefined | null): boolean {
  return !!method && MANUAL_PAYMENT_METHODS.includes(method);
}

/**
 * The two states an unresolved manual payment can be in. Derived at query
 * time from `paymentProofUrl` + `paymentReviewOutcome` rather than stored as
 * its own field — a denormalised mirror would drift the moment any write path
 * forgot it (CLAUDE.md Root Cause Pattern #42).
 */
export type PaymentReviewQueueMode = "awaiting_proof" | "awaiting_verification";

export const PAYMENT_REVIEW_QUEUE_MODES: readonly PaymentReviewQueueMode[] = [
  "awaiting_proof",
  "awaiting_verification",
];

export function isPaymentReviewQueueMode(value: string): value is PaymentReviewQueueMode {
  return (PAYMENT_REVIEW_QUEUE_MODES as readonly string[]).includes(value);
}

/**
 * Hard bound on the payment-review queue's Firestore scan (Rule #6 — the
 * Vercel 10s sync ceiling). Safe because an order only sits in this queue for
 * 15 minutes (awaiting proof) or 2 hours (awaiting verification) before a
 * scheduled sweep resolves it, so the live set is inherently small.
 */
export const PAYMENT_REVIEW_QUEUE_SCAN_LIMIT = 500;
