/*
 * WHY: `/admin/action-index` told admins "Labels, descriptions and keywords
 *      can be edited here" while offering only a Shown toggle. The server has
 *      always accepted those fields — `ActionIndexOverride` carries `label`,
 *      `description`, `keywords` and `weight`, and `PATCH
 *      /api/admin/action-index` writes them through `setOverride`. The UI had
 *      simply never grown the control, so the sentence was a promise nothing
 *      kept.
 *
 * WHAT: The write contract for ONE entry override, as edited from the admin
 *       row action.
 *
 * ## What is deliberately absent
 *
 * `href`, `kind`, `portal` and every permission field. The view's own
 * docstring draws this line and it is the right one: repointing a built-in
 * route is routing, and relaxing a permission is access control. Neither
 * belongs in a quick-edit drawer beside a label.
 *
 * `enabled` is also absent — it has its own control in the Shown column, and
 * a second place to set it is a second source of truth for one boolean.
 *
 * EXPORTS:
 *   actionIndexOverrideSchema, ActionIndexOverrideFormInput,
 *   ACTION_INDEX_OVERRIDE_FIELDS
 *
 * @tag domain:admin,search
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminActionIndexView
 * @tag sideEffects:none
 */

import { z } from "zod";
import type { QuickFieldDef } from "../../shell/QuickFormDrawer";

/**
 * 🛑 `keywords` is a COMMA-SEPARATED STRING here, not an array.
 *
 * `QuickFormDrawer` has no array control — its field types are text / number
 * / select / toggle / date / textarea / email / url. Declaring `z.string()`
 * and splitting at the call site keeps the schema honest about what the form
 * actually produces, rather than describing a shape no control can emit.
 * `splitKeywords` below is the one place that conversion happens.
 */
export const actionIndexOverrideSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "A label is required — it is what the sidebar and search show.")
    .max(80, "Keep labels under 80 characters so they fit the sidebar."),
  description: z
    .string()
    .trim()
    .max(200, "Keep descriptions under 200 characters.")
    .optional(),
  keywords: z
    .string()
    .trim()
    .max(300, "Keep the keyword list under 300 characters.")
    .optional(),
  /*
   * Ranking, not ordering. Higher sorts first in the search and the command
   * palette. Bounded because an unbounded weight is how one entry ends up
   * permanently above every other and nobody remembers why.
   */
  weight: z.coerce
    .number()
    .int("Weight must be a whole number.")
    .min(0, "Weight cannot be negative.")
    .max(100, "Weight is capped at 100.")
    .optional(),
});

export type ActionIndexOverrideFormInput = z.infer<typeof actionIndexOverrideSchema>;

/** The drawer's fields, in the order an admin reads them. */
export const ACTION_INDEX_OVERRIDE_FIELDS: QuickFieldDef[] = [
  {
    name: "label",
    label: "Label",
    type: "text",
    required: true,
    helperText: "What the sidebar, header search and command palette show.",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "One line explaining what this entry is for",
  },
  {
    name: "keywords",
    label: "Keywords",
    type: "text",
    placeholder: "refunds, returns, money back",
    helperText: "Comma-separated. Extra words that should find this entry in search.",
  },
  {
    name: "weight",
    label: "Weight",
    type: "number",
    helperText: "Higher sorts first in search results. 0–100.",
  },
];

/** The single place the comma-separated field becomes the stored array. */
export function splitKeywords(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // An empty box means "no keywords", which is `[]` — not "leave them alone".
  return parts;
}

/** The reverse, for seeding the form from a stored override. */
export function joinKeywords(keywords: readonly string[] | undefined): string {
  return (keywords ?? []).join(", ");
}
