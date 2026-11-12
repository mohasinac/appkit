/*
 * WHY: Buyer-facing order forms rendered `<Form>` with no schema.
 *
 *      ⚠ This file used to hold TWO. The manual-payment one — a screenshot, a
 *      typed UTR and a fraud declaration — was deleted 2026-11-11 with the
 *      tender; see the note where it stood, which keeps the one piece of its
 *      design worth reusing. Only the cancellation form remains, so the header
 *      no longer advertises an export that is gone (corrected 2026-11-12).
 *
 * WHAT: The order-cancellation schema.
 *
 * EXPORTS:
 *   orderCancelSchema, OrderCancelValues
 *
 * @tag domain:orders
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:user/orders/[id]/cancel
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
