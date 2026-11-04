/*
 * WHY: `AdminSiteSettingsView`'s Procurement tab (⑮) — seventh tab migrated
 *      to the Universal Template System (Phase 3B, admin site-settings form
 *      rebuild, 2026-11-04). Two `useState` calls, the smallest tab
 *      migrated so far — feeds Feature A's shipment labor-cost calculation
 *      (hours spent × hourly rate, and hours spent ÷ max hours/day for an
 *      ETA projection).
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema.laborRate`
 *      already validates `hourlyRate` with its own `money()` rule; this
 *      schema does not duplicate that bound.
 *
 * WHAT: Flat field names matching the component's own state
 *       (`laborHourlyRate`, `laborMaxHoursPerDay`), writing into the
 *       `laborRate.{hourlyRate,maxHoursPerDay}` payload keys.
 *
 *       🛑 Accepted fidelity trade-off: the original `laborHourlyRate`
 *       `onChange` rounded to 2 decimal places
 *       (`Math.round(parseFloat(v) * 100) / 100`) to avoid floating-point
 *       display noise on a rarely-edited field. The generator's default
 *       number renderer stores the raw parsed value instead — a cosmetic
 *       difference only, not worth a custom renderer for a field this low-
 *       stakes.
 *
 * EXPORTS: siteSettingsProcurementFormSchema, type SiteSettingsProcurementFormValues
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

export const siteSettingsProcurementFormSchema = z.object({
  laborHourlyRate: annotate(z.number().min(0), {
    section: "procurement", sectionLabel: "Procurement", sectionRequired: true,
    order: 1, label: "Hourly rate (₹)",
    help: "Your effective hourly wage for sorting/categorizing/listing a shipment.",
  }),
  laborMaxHoursPerDay: annotate(z.number().min(0).max(24), {
    section: "procurement", order: 2, label: "Max hours per day",
    help: "Used only to project how many days a shipment's tracked hours will take.",
  }),
});

export type SiteSettingsProcurementFormValues = z.infer<typeof siteSettingsProcurementFormSchema>;
