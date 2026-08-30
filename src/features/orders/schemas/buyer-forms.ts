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

/**
 * Uploading proof of a manual (cash / UPI / EMI) payment.
 *
 * ## Every field here is evidence
 *
 * An admin verifies or rejects on this, and a rejection carries a 7-day ban
 * cascade — so the cost of a sloppy submission is real in both directions.
 *
 * `buyerMarkedPaid` and `buyerFraudAgreementAccepted` are `z.literal(true)`
 * rather than `z.boolean()`: an unchecked declaration is not a submission with
 * a `false` in it, it is a form that must not send.
 */
export const paymentProofSchema = z.object({
  /*
   * The screenshot. It was the ONE thing the route hard-required
   * (`MISSING_PROOF_URL`) and the one field this schema did not declare, so
   * the page gated it with a toast instead of a field error — and the schema
   * could never have reported the form's most important omission.
   */
  proofUrl: annotate(
    z.string().min(1, "Upload a screenshot of the payment confirmation."),
    {
      section: "proof", sectionLabel: "Your payment", sectionRequired: true,
      order: 1, row: "full", kind: "media",
      label: "Payment screenshot (JPG/PNG/PDF)",
      help: "A screenshot of the payment confirmation from your UPI app.",
    },
  ),
  /*
   * Optional, and format-checked when present.
   *
   * It was `.min(4)` REQUIRED here while the route never checked it and the
   * page labelled it "(optional)" — three answers, and the schema's was
   * unreachable because nothing parsed it. Required is wrong: `cash` is a
   * manual payment method too and has no UTR, so demanding one would block
   * every cash order. A short-but-non-empty reference is still a typo worth
   * catching, which is what the refine keeps.
   */
  transactionId: annotate(
    z
      .string()
      .trim()
      .max(120, "Keep the reference under 120 characters.")
      .refine(
        (v) => v === "" || v.length >= 4,
        "Enter the full UTR or reference number from your payment app.",
      )
      .optional()
      .or(z.literal("")),
    { section: "proof", quick: true, order: 2, row: "pair",
      label: "UTR / transaction ID",
      help: "The reference shown in your UPI app. Leave blank for a cash payment." },
  ),
  /*
   * The UPI ID the buyer actually sent to. Compared against the store's
   * displayed one so a mismatch is flagged to the admin — which is why the
   * shape matters, not just its presence.
   */
  buyerReportedUpiId: annotate(
    z
      .string()
      .trim()
      .regex(/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/, "Enter the UPI ID you paid to, e.g. name@bank.")
      .optional()
      .or(z.literal("")),
    { section: "proof", order: 3, row: "pair",
      label: "UPI ID you paid from",
      help: "Shown in your UPI app's confirmation — it helps us verify faster." },
  ),
  buyerMarkedPaid: annotate(
    z.literal(true, { errorMap: () => ({ message: "Confirm that you have sent the payment." }) }),
    { section: "declare", sectionLabel: "Declaration", sectionRequired: true, order: 1, row: "full" },
  ),
  buyerFraudAgreementAccepted: annotate(
    z.literal(true, {
      errorMap: () => ({ message: "You must accept the fraud policy to submit proof." }),
    }),
    { section: "declare", order: 2, row: "full" },
  ),
});

export type PaymentProofValues = z.infer<typeof paymentProofSchema>;
