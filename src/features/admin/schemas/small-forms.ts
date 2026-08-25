/*
 * WHY: A cluster of small forms — three newsletter boxes, two quick-create
 *      drawers, and the payout mark-paid modal — each rendered `<Form>` with
 *      no schema. Individually each is two or three fields; together they are
 *      six surfaces where the only validation was whatever the server said
 *      after the round-trip, reported as a toast.
 *
 *      The newsletter trio matters most despite being one field: an email box
 *      that accepts anything sends a subscription request for `"asdf"` and
 *      shows a success message.
 *
 * WHAT: One module for the small shared shapes, rather than six schema files
 *       of three lines each.
 *
 * ## Why these live together and the bigger ones do not
 *
 * These have no per-entity semantics worth a file of their own — an email is
 * an email. An entity with real rules (a payout method's per-type bank
 * requirements, a listing template's defaults tree) keeps its own module,
 * because that is where the reasoning belongs. Grouping by *size* rather than
 * by domain is the exception here, and it stops at the point where a schema
 * needs a paragraph to explain itself.
 *
 * EXPORTS:
 *   newsletterSubscribeSchema, quickCreateTaxonomySchema,
 *   payoutMarkPaidSchema, and their inferred value types
 *
 * @tag domain:admin,homepage,payments
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:newsletter forms,quick-create drawers,AdminPayoutMarkPaidModal
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * Newsletter subscription — one field, shared by all three boxes (the homepage
 * banner, the homepage inline form, and the footer slot).
 *
 * Trimmed and lowercased before validation so ` Foo@Bar.com ` and
 * `foo@bar.com` cannot become two subscriptions for one person.
 */
export const newsletterSubscribeSchema = z.object({
  email: annotate(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Enter your email address.")
      .email("That doesn't look like an email address."),
    { section: "subscribe", sectionLabel: "Newsletter", sectionRequired: true, quick: true, order: 1, row: "full" },
  ),
});

export type NewsletterSubscribeValues = z.infer<typeof newsletterSubscribeSchema>;

/**
 * The quick-create drawer shared in shape by brands and categories.
 *
 * Both drawers post `{ name, description, isActive }` to their own endpoint
 * and differ in nothing else, so one schema serves both. `slug` is absent
 * deliberately — it is derived from the name on the server, and this codebase
 * treats a slug as create-only and non-editable everywhere else.
 */
export const quickCreateTaxonomySchema = z.object({
  name: annotate(z.string().trim().min(1, "A name is required.").max(80, "Keep the name under 80 characters."), {
    section: "basics", sectionLabel: "Details", sectionRequired: true, quick: true, order: 1, row: "full",
  }),
  description: annotate(z.string().max(500, "Keep the description under 500 characters.").optional(), {
    section: "basics", order: 2, row: "full", kind: "textarea",
  }),
  isActive: annotate(z.boolean().optional(), {
    section: "basics", order: 3, row: "quarter",
  }),
});

export type QuickCreateTaxonomyValues = z.infer<typeof quickCreateTaxonomySchema>;

/**
 * Marking a payout paid.
 *
 * `transactionId` is REQUIRED, which it was not before. This is the record
 * that money left the building — an empty one leaves a payout marked paid with
 * nothing to reconcile it against, and no way to answer a seller asking where
 * their money went.
 */
export const payoutMarkPaidSchema = z.object({
  transactionId: annotate(
    z
      .string()
      .trim()
      .min(3, "Enter the bank or UPI reference for this transfer.")
      .max(120, "Keep the reference under 120 characters."),
    { section: "payment", sectionLabel: "Payment", sectionRequired: true, quick: true, order: 1, row: "full" },
  ),
});

export type PayoutMarkPaidValues = z.infer<typeof payoutMarkPaidSchema>;
