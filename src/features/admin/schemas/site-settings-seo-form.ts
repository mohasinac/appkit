/*
 * WHY: `AdminSiteSettingsView`'s SEO tab (④) — third tab migrated to the
 *      Universal Template System (Phase 3B, admin site-settings form
 *      rebuild, 2026-11-04), same pattern as Branding/Announcement.
 *
 * WHAT: Flat field names matching the component's own state (`seoTitle`,
 *       …), not the nested `seo.*` keys the save payload uses.
 *
 * EXPORTS: siteSettingsSeoFormSchema, type SiteSettingsSeoFormValues
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

export const siteSettingsSeoFormSchema = z.object({
  seoTitle: annotate(z.string().trim().max(60).optional().or(z.literal("")), {
    section: "seo", sectionLabel: "SEO", sectionRequired: true,
    order: 1, row: "full", label: "Default meta title",
    help: "Max 60 chars. Use {page} token for dynamic insertion.",
  }),
  seoDescription: annotate(z.string().trim().max(160).optional().or(z.literal("")), {
    section: "seo", order: 2, row: "full", kind: "textarea",
    label: "Default meta description", help: "Max 160 chars.",
  }),
  seoOgImage: annotate(z.string().optional().or(z.literal("")), {
    section: "seo", order: 3, row: "full", kind: "media",
    sectionKeepMounted: true, label: "Default OG image",
  }),
  canonicalUrl: annotate(z.string().trim().optional().or(z.literal("")), {
    section: "seo", order: 4, row: "full", label: "Canonical base URL",
    help: "e.g. https://letitrip.in — leave blank to use the site's own domain.",
  }),
  seoNoIndex: annotate(z.boolean().optional(), {
    section: "seo", order: 5, row: "full", kind: "toggle",
    label: "Robots noindex (disables search indexing — use carefully)",
  }),
});

export type SiteSettingsSeoFormValues = z.infer<typeof siteSettingsSeoFormSchema>;
