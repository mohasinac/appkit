/*
 * WHY: `AdminTesterChecklistItemEditorView` declared a five-field
 *      `.passthrough()` schema inside the component against eleven controls,
 *      passed it to `<Form schema>`, and validated with one `if` on `label`.
 *      Two of the five — `groupKey` and `pageKey` — were rendered as raw
 *      `<Input>` with no `name`, so even had the schema run, `applyZodIssues`
 *      would have had nowhere to put their errors. The six fields it did not
 *      declare included `href`, which the tester hub turns into a "Go test
 *      this →" link and which `audit-tester-checklist-hrefs` enforces on the
 *      SEED data while the admin editor accepted anything at all.
 * WHAT: The checklist-item editor's schema — every rendered field, annotated
 *       for `buildSectionsFromSchema`.
 *
 * ## `href` is checked here as well as in the audit
 *
 * The audit only sees `tester-checklist-seed-data.ts`. An admin authoring a
 * case through the UI bypasses it entirely, and a bad link is invisible until
 * a tester clicks it and lands on a 404 — the same dead-deeplink shape as
 * Root Cause #32. A leading-slash rule cannot prove the route exists, but it
 * does reject the two things actually typed by hand: a bare page name, and a
 * full URL to another origin.
 *
 * EXPORTS:
 *   checklistItemFormSchema, type ChecklistItemFormValues
 *
 * @tag domain:tester
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminTesterChecklistItemEditorView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const checklistItemFormSchema = z.object({
  label: annotate(
    z
      .string()
      .min(3, "The test case needs at least 3 characters.")
      .max(500, "Keep the test case under 500 characters."),
    {
      section: "basics", sectionLabel: "Test case", sectionRequired: true,
      quick: true, order: 1, row: "full", label: "Test case (Yes/No question)",
      help: "Write it as a before → after, not as \"check X works\" — most defects here return a plausible-looking 200.",
    },
  ),
  description: annotate(z.string().max(1000).optional().or(z.literal("")), {
    section: "basics", order: 2, row: "full", kind: "textarea",
    label: "Description", help: "Extra context for the tester.",
  }),
  /*
   * Optional, and validated when present. `.url()` would reject the relative
   * path this field is FOR; a leading slash is what makes it a route on this
   * origin rather than someone else's.
   */
  href: annotate(
    z
      .string()
      .refine((v) => v === "" || v.startsWith("/"), {
        message: "Start the link with / — it is a route on this site, not a full URL.",
      })
      .optional()
      .or(z.literal("")),
    {
      section: "basics", order: 3, row: "full", label: "Deep link",
      help: "Jumps the tester straight to the feature being tested, e.g. /cart.",
    },
  ),

  groupLabel: annotate(z.string().min(1, "A group is required.").max(200), {
    section: "members", sectionLabel: "Where it appears", sectionRequired: true,
    order: 1, row: "pair", label: "Group",
    help: "Top-level accordion section on the Tester Hub.",
  }),
  groupKey: annotate(
    z
      .string()
      .min(1, "A group key is required.")
      .max(100)
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only."),
    {
      section: "members", order: 2, row: "pair", label: "Group key",
      help: "Auto-generated from the group name.",
    },
  ),
  pageLabel: annotate(z.string().min(1, "A page is required.").max(200), {
    section: "members", order: 3, row: "pair", label: "Page",
    help: "Sub-accordion within the group.",
  }),
  pageKey: annotate(
    z
      .string()
      .min(1, "A page key is required.")
      .max(100)
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only."),
    {
      section: "members", order: 4, row: "pair", label: "Page key",
      help: "Auto-generated from the page name.",
    },
  ),

  order: annotate(z.number().int().min(0, "Order cannot be negative."), {
    section: "limits", sectionLabel: "Ordering", order: 1, row: "pair",
    kind: "number", label: "Display order",
    help: "Lower is shown first within the page.",
  }),
  phase: annotate(z.number().int().min(1, "Phases are numbered from 1."), {
    section: "limits", order: 2, row: "pair", kind: "number", label: "Phase",
    help: "Test batch this case belongs to — testers work through one phase at a time.",
  }),

  isActive: annotate(z.boolean(), {
    section: "visibility", sectionLabel: "Visibility", order: 1, row: "full",
    label: "Active (visible to testers)",
  }),
  adminOnly: annotate(z.boolean(), {
    section: "visibility", order: 2, row: "full",
    label: "Admin-only (requires canTestAdmin)",
  }),
});

export type ChecklistItemFormValues = z.infer<typeof checklistItemFormSchema>;
