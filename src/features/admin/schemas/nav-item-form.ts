/*
 * WHY: `AdminNavEditorView` rendered a `<Form>` with no `schema` prop, so the
 *      only validation on a navigation item was whatever the server said after
 *      the round-trip — a 400 banner rather than an error on the field that
 *      caused it. The route DID validate (`navItemSchema` /
 *      `updateNavItemSchema` in `api/admin/navigation`), so nothing invalid
 *      was ever stored; the gap was purely that the admin was told badly.
 * WHAT: The nav-item form schema, shared by the editor and the routes so the
 *       two cannot disagree about what a valid nav item is.
 *
 * ## `href` is checked against real routes only loosely
 *
 * A nav item pointing at a page that does not exist is a real defect —
 * `audit-nav-page-wiring` blocks it — but that check needs the filesystem and
 * therefore cannot run in a browser. Here the rule is only "shaped like a
 * path"; the audit remains the authority on whether the path resolves.
 *
 * EXPORTS:
 *   navItemFormSchema, navItemCreateSchema, navItemUpdateSchema,
 *   type NavItemFormValues
 *
 * @tag domain:admin,navigation
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminNavEditorView,/api/admin/navigation
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * A path or an absolute URL.
 *
 * Hoisted for readability only. It was originally inlined, and that surfaced a
 * real bug in `audit-field-ui-meta`: its comment-stripper did not understand
 * regex literals, so the trailing `\/\/` of this pattern read as the start of
 * a line comment and blanked the rest of the line — unbalancing the brace walk
 * and reporting a false NO_SECTION. The audit now handles regex literals; this
 * stays hoisted because it reads better, not because it has to.
 */
const hrefSchema = z
  .string()
  .min(1, "A destination is required.")
  .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), {
    message: "Use a path starting with / or a full http(s) URL.",
  });

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const navItemFormSchema = z.object({
  label: annotate(z.string().min(1, "A label is required.").max(60, "Keep the label under 60 characters."), {
    section: "basics", sectionLabel: "Nav item", sectionRequired: true,
    quick: true, order: 1, row: "pair",
  }),
  href: annotate(hrefSchema, { section: "basics", quick: true, order: 2, row: "pair" }),
  icon: annotate(z.string().max(60).optional(), {
    section: "basics", order: 3, row: "pair",
  }),
  order: annotate(
    z.coerce.number().int("Order must be a whole number.").min(0, "Order cannot be negative.").optional(),
    { section: "placement", sectionLabel: "Placement", order: 1, row: "pair" },
  ),
  parentId: annotate(z.string().max(80).optional(), {
    section: "placement", order: 2, row: "pair",
    help: "Leave blank for a top-level item.",
  }),
  isVisible: annotate(z.boolean().optional(), {
    section: "placement", order: 3, row: "quarter",
  }),
});

export type NavItemFormValues = z.infer<typeof navItemFormSchema>;

/** Create contract — `label` and `href` are what make an item usable at all. */
export const navItemCreateSchema = navItemFormSchema;

/** Update contract — every field optional. */
export const navItemUpdateSchema = navItemFormSchema.partial();
