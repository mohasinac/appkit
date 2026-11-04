/*
 * WHY: `AdminSiteSettingsView`'s Branding tab (⓪/① in the tab registry) was
 *      eight independent `useState` calls and hand-written JSX — no schema,
 *      no `buildSectionsFromSchema`, unlike the rest of the Universal
 *      Template System rollout. First real tab migrated under that system
 *      (Phase 3B, admin site-settings form rebuild, 2026-11-04).
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema`
 *      (`./site-settings-form.ts`), which is the save-time VALIDATION schema
 *      for the groups it already covers (commissions, gst, emi, …) and stays
 *      untouched — it is `.passthrough()` and does not declare these fields,
 *      so adding this schema changes nothing about what it validates. This
 *      schema is RENDER-only, consumed by `buildSectionsFromSchema` to
 *      generate the tab's fields; `handleSaveAll`'s existing
 *      `siteSettingsFormSchema.safeParse(buildFullPayload())` call is
 *      unaffected.
 *
 * WHAT: Flat field names matching the EXISTING component state
 *       (`logoUrl`, `maintenanceMode`, …), not the nested keys the save
 *       payload uses (`logo`, `maintenance.enabled`, …) — `buildFullPayload()`
 *       already does that flat-to-nested transform and keeps doing so,
 *       reading from this schema's values object instead of eight separate
 *       `useState` vars.
 *
 * EXPORTS: siteSettingsBrandingFormSchema, type SiteSettingsBrandingFormValues
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

export const siteSettingsBrandingFormSchema = z.object({
  siteName: annotate(z.string().trim().max(120).optional().or(z.literal("")), {
    section: "identity", sectionLabel: "Identity", sectionRequired: true,
    order: 1, row: "pair", label: "Site name",
  }),
  tagline: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
    section: "identity", order: 2, row: "pair", label: "Tagline",
    help: "e.g. \"India's Largest Collectibles Marketplace\".",
  }),
  logoUrl: annotate(z.string().optional().or(z.literal("")), {
    section: "identity", order: 3, row: "pair", kind: "media",
    sectionKeepMounted: true, label: "Logo",
  }),
  faviconUrl: annotate(z.string().optional().or(z.literal("")), {
    section: "identity", order: 4, row: "pair", kind: "media",
    sectionKeepMounted: true, label: "Favicon",
  }),

  maintenanceMode: annotate(z.boolean().optional(), {
    section: "maintenance", sectionLabel: "Maintenance & messaging",
    sectionRequired: true, order: 1,
    row: "quarter", kind: "toggle", label: "Maintenance mode",
  }),
  /*
   * `when` gates visibility, not validity — the message can stay blank while
   * maintenance mode is off without needing a `superRefine`, since an empty
   * string is always a valid value for this field. Mirrors the hand-written
   * `disabled={!maintenanceMode}` this replaces.
   */
  maintenanceMessage: annotate(z.string().trim().max(300).optional().or(z.literal("")), {
    section: "maintenance", order: 2, row: "full", label: "Maintenance message",
    when: (values) => Boolean(values.maintenanceMode),
  }),
  chatEnabled: annotate(z.boolean().optional(), {
    section: "maintenance", order: 3, row: "quarter", kind: "toggle",
    label: "Buyer-seller messaging enabled",
  }),
  assistantEnabled: annotate(z.boolean().optional(), {
    section: "maintenance", order: 4, row: "quarter", kind: "toggle",
    label: "Customer assistant enabled",
    help: "Floating chat widget + full-chat page.",
  }),
});

export type SiteSettingsBrandingFormValues = z.infer<typeof siteSettingsBrandingFormSchema>;
