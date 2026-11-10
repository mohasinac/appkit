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

/*
 * 🛑 `MANUAL_PAYMENT_METHODS` and `isManualPaymentMethod` DELETED 2026-11-11.
 *
 * The list named the tenders that settle OUT OF BAND and therefore need a
 * human to confirm them. It is now empty: `upi_manual` was retired as
 * unverifiable, and the owner then removed `cash` (cash on pickup) too --
 * *"we only stick with online or cod which will be handled by the shipment
 * provider."* COD is collected by the courier and settles back to us, so it
 * is not an out-of-band tender a human adjudicates; `isManualPaymentMethod
 * ("cod")` was always false by design.
 *
 * ⚠ A predicate over an empty set is worse than no predicate: it compiles,
 * it is callable, it silently answers `false` everywhere, and every branch
 * it guards becomes unreachable code that still looks live. Deleting it
 * forces each of its ~23 call sites to be looked at rather than quietly
 * neutered.
 */

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
