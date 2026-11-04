/*
 * WHY: `AdminSiteSettingsView`'s Announcement tab (③) — second tab migrated
 *      to the Universal Template System (Phase 3B, admin site-settings form
 *      rebuild, 2026-11-04), same pattern as the Branding tab
 *      (`./site-settings-branding-form.ts`): hand-written `useState` + JSX
 *      replaced with schema + `buildSectionsFromSchema`.
 *
 *      Constraints mirror the EXISTING `siteSettingsFormSchema.announcementBar`
 *      group (`message` max 300, `link` an optional URL) so the render layer
 *      never accepts something the save-time validator then rejects.
 *
 * WHAT: Flat field names matching the component's own state
 *       (`announcementEnabled`, …), not the nested `announcementBar.*` keys
 *       the save payload uses — `buildFullPayload()` does that transform.
 *
 * EXPORTS: siteSettingsAnnouncementFormSchema, type SiteSettingsAnnouncementFormValues
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

/** Matches `siteSettingsFormSchema`'s own `optionalUrl`. */
const optionalUrl = z.string().trim().url("Enter a full URL, including https://.").optional().or(z.literal(""));

export const siteSettingsAnnouncementFormSchema = z.object({
  announcementEnabled: annotate(z.boolean().optional(), {
    section: "announcement", sectionLabel: "Announcement bar", sectionRequired: true,
    order: 1, row: "full", kind: "toggle", label: "Show announcement bar",
  }),
  announcementText: annotate(z.string().trim().max(300).optional().or(z.literal("")), {
    section: "announcement", order: 2, row: "pair", label: "Announcement text",
    help: "e.g. \"\u{1F389} Free shipping on orders ₹999+\".",
    when: (values) => Boolean(values.announcementEnabled),
  }),
  announcementLink: annotate(optionalUrl, {
    section: "announcement", order: 3, row: "pair", label: "Link URL (optional)",
    when: (values) => Boolean(values.announcementEnabled),
  }),
  /*
   * No dedicated "color" FieldKind exists (`inputType` covers text/email/
   * password/tel/url/search only), and adding one for a single field across
   * this codebase isn't warranted — a custom `renderers` override is the
   * same escape hatch already proven for the Branding tab's media fields.
   */
  announcementBg: annotate(z.string().trim().optional().or(z.literal("")), {
    section: "announcement", order: 4, row: "pair", label: "Background color",
    when: (values) => Boolean(values.announcementEnabled),
  }),
});

export type SiteSettingsAnnouncementFormValues = z.infer<typeof siteSettingsAnnouncementFormSchema>;
