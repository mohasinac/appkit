/*
 * WHAT: The tax-code editor's schema — the field set, annotated for
 *       `buildSectionsFromSchema`, with the HSN-format rule as a refinement
 *       rather than a hint under the input.
 *
 * ## 🛑 Why the HSN rule is a refinement and not placeholder text
 *
 * A malformed HSN does not fail loudly. It propagates: a category points at
 * the tax code, `deriveTaxonomy` writes `hsnCode` onto every product derived
 * from that category, and the order item snapshots it onto a GST invoice.
 * Nothing in that chain validates the string again, and the invoice is the
 * first place a human might notice — by which point the sale is recorded.
 *
 * So the format is checked at the one place it enters the system. The same
 * route serves the inline-create path in the seller form, which is the busiest
 * surface and the one most likely to be used in a hurry.
 *
 * ## The exemption row is the reason `hsnCode` is not simply required
 *
 * A 0% row (live plants, live animals) has no HSN. Requiring one would force
 * an author to invent a code to express an exemption, and an invented HSN on
 * an invoice is exactly the failure above. So the refinement is conditional:
 * blank is legal only at rate 0.
 *
 * 🛑 The two option arrays are exported for the VIEW to pass as
 * `options: { gstRate: GST_RATE_OPTIONS, chapter: HSN_CHAPTER_OPTIONS }` —
 * `FieldUiMeta` has no `options` key, and `annotate` would silently accept
 * neither. That split follows `AdminBundleEditorView`, which supplies
 * `BUNDLE_RULE_TYPE_OPTIONS` the same way: a select's VALUES are schema, its
 * option list is often runtime data (brands, categories) and so belongs to
 * whoever can fetch it.
 *
 * EXPORTS:
 *   taxCodeFormSchema, type TaxCodeFormValues, GST_RATE_OPTIONS,
 *   HSN_CHAPTER_OPTIONS
 *
 * @tag domain:tax-codes
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminTaxCodeEditorView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { GST_RATE_VALUES, isValidHsnCode } from "./firestore";

/** The GST slabs, as the rate select offers them. */
export const GST_RATE_OPTIONS: { value: string; label: string }[] =
  GST_RATE_VALUES.map((r) => ({
    value: String(r),
    label: r === 0 ? "0% — exempt" : `${r}%`,
  }));

/**
 * Chapter options.
 *
 * 🛑 The two non-9503 chapters are offered because the merchandise exists
 * (printed cards and stickers; playing cards), and their labels say the rate is
 * unverified rather than implying one. Picking a chapter does not set a rate.
 */
export const HSN_CHAPTER_OPTIONS: { value: string; label: string }[] = [
  { value: "9503", label: "9503 — Toys (verified)" },
  { value: "4911", label: "4911 — Printed matter: cards, stickers, posters (rate unverified)" },
  { value: "9504", label: "9504 — Playing cards, board games (rate unverified)" },
  { value: "exempt", label: "Exempt — no HSN" },
];

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const taxCodeFormSchema = z
  .object({
    label: annotate(
      z
        .string()
        .min(1, "Give the code a label an admin will recognise in a picker.")
        .max(150, "Keep the label under 150 characters."),
      {
        section: "basics",
        sectionLabel: "Tax code",
        sectionRequired: true,
        quick: true,
        order: 1,
        label: "Label",
        help: 'What the picker shows, e.g. "Toys, non-electronic (HSN 9503 0020) — 5%".',
      },
    ),
    /*
     * A STRING, not a number: leading zeros are significant in an HSN code
     * (`04` is not `4`) and a numeric input would eat them. Digits-only is
     * enforced by the refinement below, against the real 4/6/8-digit rule.
     */
    hsnCode: annotate(
      z.string().trim().max(8, "An HSN code is at most 8 digits.").optional(),
      {
        section: "basics",
        quick: true,
        order: 2,
        row: "pair",
        label: "HSN code",
        help: "4, 6 or 8 digits. Leave blank only for a 0% exemption.",
      },
    ),
    gstRate: annotate(
      z.coerce
        .number()
        .refine((v) => (GST_RATE_VALUES as readonly number[]).includes(v), {
          message: "Pick one of the GST slabs: 0, 5, 12, 18 or 28.",
        }),
      {
        section: "basics",
        sectionRequired: true,
        quick: true,
        order: 3,
        row: "pair",
        kind: "select",
        label: "GST rate",
      },
    ),
    chapter: annotate(
      z.enum(["9503", "4911", "9504", "exempt"]).optional(),
      {
        section: "basics",
        order: 4,
        kind: "select",
        label: "Chapter",
        help: "Groups the picker. Only chapter 9503's rates are verified.",
      },
    ),
    description: annotate(
      z.string().max(500).optional(),
      { section: "detail", sectionLabel: "Detail", order: 1, kind: "textarea", label: "Description" },
    ),
    notes: annotate(
      z.string().max(1000).optional(),
      {
        section: "detail",
        order: 2,
        kind: "textarea",
        label: "Notes",
        help: "Why this rate, and what it covers. The thing a future admin will want.",
      },
    ),
    isActive: annotate(z.boolean(), {
      section: "detail",
      order: 3,
      label: "Active",
      help: "An inactive code is never resolved onto a product, and disappears from the picker.",
    }),
  })
  .superRefine((values, ctx) => {
    const hsn = values.hsnCode?.trim() ?? "";

    // Blank is legal ONLY at 0%. See the header: forcing an HSN on an exemption
    // is what gets a code invented, and an invented code reaches an invoice.
    if (hsn === "") {
      if (values.gstRate !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hsnCode"],
          message:
            "An HSN code is required for any rate above 0%. Leave it blank only to record an exemption.",
        });
      }
      return;
    }

    if (!isValidHsnCode(hsn)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hsnCode"],
        message: "An HSN code must be exactly 4, 6 or 8 digits — no spaces or dots.",
      });
    }
  });

export type TaxCodeFormValues = z.infer<typeof taxCodeFormSchema>;
