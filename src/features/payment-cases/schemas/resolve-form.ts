/**
 * The contract for resolving a payment case — ONE schema, three readers.
 *
 * ## Why a schema and not just the repository's check
 *
 * `PaymentCasesRepository.resolve()` already refuses a resolution shorter than
 * `PAYMENT_CASE_RESOLUTION_MIN`, and that check is load-bearing and stays. But
 * a runtime throw from the repository reaches the operator as a failed request
 * after they have typed and submitted — the note is gone and the error has no
 * field to land on, so it renders as a banner. That is precisely the shape
 * `ReviewDecisionModal` was built to replace on the moderation and report
 * surfaces.
 *
 * So the same floor is declared here, where the modal, the route and the
 * repository can all read it:
 *
 *   · the MODAL parses before submitting, so the message lands on the textarea;
 *   · the ROUTE parses the body, so a caller bypassing the UI gets a 400 with
 *     `issues` rather than a 500 from a repository assertion;
 *   · the REPOSITORY keeps its own assertion, because it is the last line and
 *     a schema cannot be relied on by a caller that does not use it.
 *
 * Modelled field-for-field on `reportReviewFormSchema`, which exists for the
 * identical reason on a collection `PaymentCaseDocument` deliberately mirrors.
 *
 * ## 🛑 `resolvedBy` and `resolvedAt` are NOT fields, and that is the point
 *
 * `reportReviewFormSchema`'s header records what happened when a client was
 * allowed to send its own `resolvedAt`: `new Date()` does not survive
 * `JSON.stringify`, so an ISO **string** was written into a field declared
 * `Date`, and the collection ended up holding both shapes for one field.
 *
 * Here it would be worse than a type split. `resolve()` asserts
 * `resolvedBy !== "system"` — that assertion is the whole mechanism keeping a
 * case human-closed — and a client-supplied `resolvedBy` would let any caller
 * name itself whatever it liked. The server stamps both from the session.
 *
 * EXPORTS:
 *   paymentCaseResolveFormSchema, paymentCaseResolveUpdateSchema,
 *   PAYMENT_CASE_REVIEWER_STATUSES, type PaymentCaseResolveFormValues
 *
 * @tag domain:payment-cases
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:admin/money-cases,/api/admin/payment-cases/[id]
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import {
  PAYMENT_CASE_RESOLUTION_MIN,
  type PaymentCaseStatus,
} from "./firestore";

/**
 * The statuses a human review can set. `open` is the state a case is born in
 * and nothing may set it back — a case that has been looked at has been looked
 * at.
 *
 * `satisfies readonly PaymentCaseStatus[]` rather than restated, so a value
 * outside the real union is a COMPILE error instead of a chip that silently
 * matches nothing (Root Cause #33).
 */
export const PAYMENT_CASE_REVIEWER_STATUSES = [
  "under-review",
  "actioned",
  "dismissed",
] as const satisfies readonly PaymentCaseStatus[];

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const paymentCaseResolveFormSchema = z
  .object({
    status: annotate(z.enum(PAYMENT_CASE_REVIEWER_STATUSES), {
      section: "review",
      sectionLabel: "Case decision",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    resolution: annotate(
      z.string().max(2000, "Keep the resolution under 2000 characters.").optional(),
      {
        section: "review",
        order: 2,
        row: "full",
        kind: "textarea",
        help: "Required when actioning or dismissing — say what you did, and what you checked.",
      },
    ),
  })
  .strict()
  .superRefine((v, ctx) => {
    /*
     * Taking a case for review needs no note; closing one does.
     *
     * 🛑 The floor is `PAYMENT_CASE_RESOLUTION_MIN`, imported rather than
     * retyped, and it is higher than a non-empty check for a measured reason:
     * the case queue's whole value is that a closed case explains itself to the
     * next person, and "done", "ok" and "fixed" explain nothing. On money that
     * matters more than elsewhere — a `missing_order` closed with "ok" leaves
     * no way to tell "I refunded the buyer" from "I decided it was a duplicate".
     *
     * Trimmed before measuring, so ten spaces is not a resolution.
     */
    if (v.status === "under-review") return;
    const note = v.resolution?.trim() ?? "";
    if (note.length < PAYMENT_CASE_RESOLUTION_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolution"],
        message: `Say what was done about this case — at least ${PAYMENT_CASE_RESOLUTION_MIN} characters.`,
      });
    }
  });

export type PaymentCaseResolveFormValues = z.infer<typeof paymentCaseResolveFormSchema>;

/** Route contract — identical; resolving a case is one atomic decision. */
export const paymentCaseResolveUpdateSchema = paymentCaseResolveFormSchema;
