/*
 * WHY: Two buyer-facing order forms rendered `<Form>` with no schema.
 *
 *      The manual-payment one is the consequential case. It carries the
 *      buyer's own claim that they have paid — a UTR, the UPI ID they sent to,
 *      and a fraud declaration — and an admin decides on that evidence whether
 *      to release goods. `transactionId` was free text with no floor, so a
 *      single character satisfied it and reached the review queue looking like
 *      a reference.
 *
 * WHAT: The two schemas, plus a shared `cancellationReason`.
 *
 * EXPORTS:
 *   orderCancelSchema, paymentProofSchema, and their inferred value types
 *
 * @tag domain:orders
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:user/orders/[id]/cancel,user/orders/[id]/payment
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * Cancelling an order.
 *
 * A reason floor of 5 characters, because this text is what the seller reads
 * to decide whether to restock, refund early or dispute — and "x" tells them
 * nothing. Deliberately low: the buyer is cancelling, not writing an essay,
 * and a high floor would push them to type filler.
 */
export const orderCancelSchema = z.object({
  reason: annotate(
    z
      .string()
      .trim()
      .min(5, "Give a short reason — the seller sees this.")
      .max(500, "Keep it under 500 characters."),
    {
      section: "cancel",
      sectionLabel: "Why are you cancelling?",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "full",
      kind: "textarea",
    },
  ),
});

export type OrderCancelValues = z.infer<typeof orderCancelSchema>;

/*
 * 🛑 `paymentProofSchema` / `PaymentProofValues` DELETED 2026-11-11.
 *
 * This validated the buyer's manual-payment submission: a screenshot, a typed
 * UTR, a "I have paid" declaration and a fraud agreement. Its own header
 * opened with "Every field here is evidence" — and that was the problem. An
 * uploaded image and a typed reference are ASSERTIONS; nothing in the chain
 * compared either against a bank or a gateway.
 *
 * ⚠ One piece of its design is worth carrying forward: `buyerMarkedPaid` and
 * `buyerFraudAgreementAccepted` were `z.literal(true)`, not `z.boolean()` —
 * an unchecked declaration is not a submission containing `false`, it is a
 * form that must not send. Reuse that shape for any required agreement.
 */
