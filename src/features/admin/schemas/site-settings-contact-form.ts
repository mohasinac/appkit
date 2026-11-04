/*
 * WHY: `AdminSiteSettingsView`'s Contact & Social tab (⑤) — fourth tab
 *      migrated to the Universal Template System (Phase 3B, admin
 *      site-settings form rebuild, 2026-11-04), same pattern as the three
 *      before it.
 *
 *      Constraints mirror the EXISTING `siteSettingsFormSchema.contact`
 *      group (`email`/`supportEmail` both validated as optional emails) so
 *      the render layer never accepts something the save-time validator
 *      then rejects.
 *
 * WHAT: Flat field names matching the component's own state
 *       (`supportEmail`, `instagram`, …), not the nested `contact.*` /
 *       `socialLinks.*` keys the save payload uses.
 *
 * EXPORTS: siteSettingsContactFormSchema, type SiteSettingsContactFormValues
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

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
/** Matches `siteSettingsFormSchema`'s own `optionalEmail`. */
const optionalEmail = z.string().trim().toLowerCase().email("That doesn't look like an email address.").optional().or(z.literal(""));

export const siteSettingsContactFormSchema = z.object({
  supportEmail: annotate(optionalEmail, {
    section: "contact", sectionLabel: "Contact", sectionRequired: true,
    order: 1, row: "pair", label: "Support email", inputType: "email",
  }),
  supportPhone: annotate(optionalText(40), {
    section: "contact", order: 2, row: "pair", label: "Support phone",
    inputType: "tel", help: "e.g. +91 XXXXX XXXXX.",
  }),
  supportAddress: annotate(optionalText(300), {
    section: "contact", order: 3, row: "full", label: "Physical address",
  }),
  supportHours: annotate(optionalText(100), {
    section: "contact", order: 4, row: "full", label: "Support hours",
    help: "e.g. Mon–Fri, 10 AM – 6 PM IST.",
  }),
  whatsapp: annotate(optionalText(20), {
    section: "contact", order: 5, row: "pair", label: "WhatsApp number",
    inputType: "tel", help: "e.g. +91XXXXXXXXXX.",
  }),
  /*
   * 🛑 Already stored and already read by the manual-payment flow — see the
   * original hand-written comment this migration preserves the intent of.
   * Not a secret (a UPI VPA is shown to buyers at checkout), so no masking
   * needed, but it IS a real payment-collection identifier, kept in its own
   * row for visibility rather than buried among social links.
   */
  upiVpa: annotate(optionalText(100), {
    section: "contact", order: 6, row: "pair", label: "Business UPI VPA",
    help: "e.g. name@bank.",
  }),

  instagram: annotate(optionalText(300), {
    section: "social", sectionLabel: "Social links", order: 1, row: "pair",
    label: "Instagram URL", inputType: "url", help: "e.g. https://instagram.com/yourbrand.",
  }),
  twitter: annotate(optionalText(300), {
    section: "social", order: 2, row: "pair", label: "Twitter / X URL",
    inputType: "url", help: "e.g. https://twitter.com/yourbrand.",
  }),
  facebook: annotate(optionalText(300), {
    section: "social", order: 3, row: "pair", label: "Facebook URL",
    inputType: "url", help: "e.g. https://facebook.com/yourbrand.",
  }),
  youtube: annotate(optionalText(300), {
    section: "social", order: 4, row: "pair", label: "YouTube URL",
    inputType: "url", help: "e.g. https://youtube.com/@yourbrand.",
  }),
  linkedin: annotate(optionalText(300), {
    section: "social", order: 5, row: "pair", label: "LinkedIn URL",
    inputType: "url", help: "e.g. https://linkedin.com/company/yourbrand.",
  }),
  pinterest: annotate(optionalText(300), {
    section: "social", order: 6, row: "pair", label: "Pinterest URL",
    inputType: "url", help: "e.g. https://pinterest.com/yourbrand.",
  }),
});

export type SiteSettingsContactFormValues = z.infer<typeof siteSettingsContactFormSchema>;
