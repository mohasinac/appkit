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
/**
 * Methods whose payment is confirmed by a HUMAN rather than by a provider.
 *
 * 🛑 `emi` was removed 2026-11-11 (owner: *"emi is removed from the code as
 * that is now built into the payment gateways"*), and its presence here was a
 * real defect rather than dead config. Membership drives
 * `isManualPaymentMethod`, which gates the proof-upload flow, the 15-minute
 * `paymentDeadline`, the admin payment-review queue and
 * `paymentWindowTimeout`'s auto-cancel.
 *
 * So a gateway-settled EMI order was being given a manual-payment window it
 * could never satisfy: nobody uploads a screenshot for an instalment the
 * gateway already confirmed, so the proof stayed absent, the deadline lapsed,
 * and `paymentWindowTimeout` would cancel and restock a legitimately paid
 * order. The method list was the only thing saying it was manual.
 *
 * ⚠ Historical EMI orders keep their stored fields — this changes which
 * orders ENTER the manual flow, not how existing ones are read. Same
 * stop-creating-before-deleting staging used for `upi_manual`.
 */
/*
 * ⚠ `upi_manual` STAYS in this list even though checkout no longer accepts it.
 *
 * Membership drives `isManualPaymentMethod`, which the ADMIN order editor and
 * the payment-review queue use to decide whether to render a historical
 * order's proof, UTR and review controls. Removing it would make every past
 * `upi_manual` order un-reviewable — fields stay, actions go, which is the
 * same staging used for the rest of this removal.
 *
 * The entry point is what was closed: `CHECKOUT_PAYMENT_METHODS` and the API
 * validators no longer accept `upi_manual`, so no NEW order can enter the
 * flow. This list only governs how existing ones are read.
 */
export const MANUAL_PAYMENT_METHODS: readonly string[] = ["cash", "upi_manual"];

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
