/*
 * WHY: `AdminSiteSettingsView`'s Platform Limits tab (⑪) — eighth tab
 *      migrated to the Universal Template System (Phase 3B, admin
 *      site-settings form rebuild, 2026-11-04). Three `useState` calls.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here).
 *
 *      🛑 Carried forward verbatim from the original JSX comment, NOT acted
 *      on (out of scope for a render-layer migration): "Max custom sections
 *      per product" was removed 2026-10-19 as fully inert — no declared
 *      default, no seeded value, its only reader was this component's own
 *      React-state fallback. The SAME check against its three siblings here
 *      (`maxProductsPerStore`, `maxCustomFieldsPerProduct`,
 *      `orderCancellationWindowHours`) found them ALSO unread anywhere
 *      outside this file — i.e. the whole Limits tab may be decorative.
 *      Left exactly as found; this migration changes the render layer only,
 *      not what the fields do or don't enforce.
 *
 * WHAT: Flat field names matching the component's own state
 *       (`maxProductsPerStore`, `maxCustomFields`, `orderCancelWindow`),
 *       writing into `platformLimits.{maxProductsPerStore,
 *       maxCustomFieldsPerProduct, orderCancellationWindowHours}`.
 *
 * EXPORTS: siteSettingsLimitsFormSchema, type SiteSettingsLimitsFormValues
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

export const siteSettingsLimitsFormSchema = z.object({
  maxProductsPerStore: annotate(z.number().min(1), {
    section: "limits", sectionLabel: "Platform Limits", sectionRequired: true,
    order: 1, label: "Max products per store",
  }),
  maxCustomFields: annotate(z.number().min(0), {
    section: "limits", order: 2, label: "Max custom fields per product",
  }),
  orderCancelWindow: annotate(z.number().min(0), {
    section: "limits", order: 3, label: "Order cancellation window (hours)",
  }),
});

export type SiteSettingsLimitsFormValues = z.infer<typeof siteSettingsLimitsFormSchema>;
