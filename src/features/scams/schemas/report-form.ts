/*
 * WHY: The public scam-report form (`/scams/report`) rendered `<Form>` with no
 *      schema. It is the highest-consequence unvalidated form in the app: a
 *      submission names a real person or business by phone number, UPI ID or
 *      email and asks the platform to publish an accusation against them.
 *
 *      Everything was free text. `amountLost` in particular was a string with
 *      no bound, and it is displayed on the public scammer profile.
 *
 * WHAT: The submit contract.
 *
 * ## At least one identifier is required, and no single one is
 *
 * A report naming nobody is unactionable, but demanding a phone number would
 * reject a report about an email-only scammer. So the requirement is on the
 * SET, checked in a `superRefine` — the same shape the payout-method schema
 * uses for its per-type bank rules.
 *
 * ## `agreed` is `z.literal(true)`
 *
 * An unticked declaration is not a submission carrying `false`; it is a form
 * that must not send. The user is asserting the accusation is truthful, and
 * that assertion is what makes publishing it defensible.
 *
 * EXPORTS: scamReportFormSchema, type ScamReportFormValues
 *
 * @tag domain:scams
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:scams/report page
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

const UPI_VPA_RE = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const PHONE_RE = /^(\+?91[-\s]?)?[6-9]\d{9}$/;

export const scamReportFormSchema = z
  .object({
    displayName: annotate(
      z.string().trim().min(2, "Give the name or handle they used.").max(160),
      { section: "who", sectionLabel: "Who", sectionRequired: true, quick: true, order: 1, row: "full" },
    ),
    // Each entry is shape-checked; the SET is checked in the superRefine.
    phones: annotate(
      z.array(z.string().trim().regex(PHONE_RE, "Enter a 10-digit Indian mobile number.")).max(10).optional(),
      { section: "who", order: 2, row: "full", kind: "list" },
    ),
    upiIds: annotate(
      z.array(z.string().trim().regex(UPI_VPA_RE, "Enter a valid UPI ID, e.g. name@bank.")).max(10).optional(),
      { section: "who", order: 3, row: "full", kind: "list" },
    ),
    emails: annotate(
      z.array(z.string().trim().toLowerCase().email("Enter a valid email address.")).max(10).optional(),
      { section: "who", order: 4, row: "full", kind: "list" },
    ),

    scamType: annotate(z.string().trim().min(1, "Choose what kind of scam this was."), {
      section: "what", sectionLabel: "What happened", sectionRequired: true, quick: true, order: 1, row: "pair",
    }),
    scamPlatform: annotate(z.string().trim().max(120).optional(), {
      section: "what", order: 2, row: "pair",
    }),
    /*
     * Coerced and bounded. It arrives from a text input and is rendered on the
     * public profile, so an unbounded string could publish "one MILLION crore"
     * as a loss figure. Empty is allowed — plenty of reports are about an
     * attempt that cost nothing.
     */
    amountLost: annotate(
      z.coerce
        .number({ invalid_type_error: "Enter the amount as a number." })
        .min(0, "An amount cannot be negative.")
        .max(100_000_000, "That looks like a typo.")
        .optional(),
      { section: "what", order: 3, row: "pair", kind: "number" },
    ),
    itemInvolved: annotate(z.string().trim().max(200).optional(), {
      section: "what", order: 4, row: "pair",
    }),
    description: annotate(
      z
        .string()
        .trim()
        .min(30, "Describe what happened in at least 30 characters — this is the evidence.")
        .max(5000, "Keep the description under 5000 characters."),
      { section: "what", order: 5, row: "full", kind: "textarea" },
    ),

    reportedByAnon: annotate(z.boolean().optional(), {
      section: "declare", sectionLabel: "Declaration", order: 1, row: "quarter",
    }),
    agreed: annotate(
      z.literal(true, {
        errorMap: () => ({ message: "You must confirm this report is truthful before submitting." }),
      }),
      { section: "declare", order: 2, row: "full" },
    ),
  })
  .superRefine((v, ctx) => {
    const count =
      (v.phones?.length ?? 0) + (v.upiIds?.length ?? 0) + (v.emails?.length ?? 0);
    if (count === 0) {
      // Reported on `phones` so the message has a field to land on; the text
      // names all three, because any one of them satisfies the rule.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phones"],
        message: "Add at least one phone number, UPI ID or email — a report with no identifier cannot be acted on.",
      });
    }
  });

export type ScamReportFormValues = z.infer<typeof scamReportFormSchema>;
