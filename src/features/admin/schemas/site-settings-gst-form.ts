/*
 * WHY: `AdminSiteSettingsView`'s GST tab (⑰, Indian tax compliance) —
 *      eleventh tab migrated to the Universal Template System (Phase 3B,
 *      admin site-settings form rebuild, 2026-11-04). Four `useState`
 *      calls, small by field count but carrying real cross-field business
 *      validation (`validateGstEnablement()`,
 *      `_internal/shared/features/site-settings/gst-registration.ts`) that
 *      is NOT expressible as a plain Zod rule — a GSTIN's own check digit,
 *      conditional-on-`enabled` required-ness for all three identity
 *      fields.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema.gst` already
 *      validates `gstin` format and `ratePercent`; this schema does not
 *      duplicate those.
 *
 * WHAT: Flat field names matching the component's own state (`gstin`,
 *       `gstLegalName`, `gstAddress`), writing into
 *       `gst.{enabled,gstin,legalName,address}`.
 *
 *       `gstin`/`gstLegalName`/`gstAddress` all keep custom renderers that
 *       call `validateGstEnablement()` LIVE against the renderer's own
 *       `values` parameter (not a separately memoized `gstProblems` state)
 *       — simpler than the original's `useMemo` and provably reactive to
 *       exactly what's on screen, since `values` IS what's on screen.
 *
 * EXPORTS: siteSettingsGstFormSchema, type SiteSettingsGstFormValues
 *
 * @tag domain:admin
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminSiteSettingsView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

export const siteSettingsGstFormSchema = z.object({
  gstEnabled: annotate(z.boolean(), {
    section: "gst", sectionLabel: "Gst", sectionRequired: true,
    order: 1, row: "full", kind: "toggle", label: "Enable GST on checkout",
    help: "Required before enabling GST-inclusive checkout (P-8). Also set a GST rate + HSN code on each taxable product for the tax breakdown to appear.",
  }),
  gstin: annotate(z.string().trim().max(15).optional().or(z.literal("")), {
    section: "gst", order: 2, label: "GSTIN",
    help: "15-character GST Identification Number, e.g. 29AAAAA0000A1Z5.",
  }),
  gstLegalName: annotate(z.string().trim().optional().or(z.literal("")), {
    section: "gst", order: 3, label: "Legal name",
    help: "Registered business name for invoices.",
  }),
  gstAddress: annotate(z.string().trim().optional().or(z.literal("")), {
    section: "gst", order: 4, row: "full", kind: "textarea", label: "Registered address",
    help: "Registered business address for GST invoices.",
  }),
});

export type SiteSettingsGstFormValues = z.infer<typeof siteSettingsGstFormSchema>;
