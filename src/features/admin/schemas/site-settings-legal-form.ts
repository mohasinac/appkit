/*
 * WHY: `AdminSiteSettingsView`'s Legal Policies tab (⑫) — thirteenth tab
 *      migrated to the Universal Template System (Phase 3B, admin
 *      site-settings form rebuild, 2026-11-04). Nine `useState` calls, all
 *      the SAME shape — a raw HTML-source textarea — which the original
 *      JSX already rendered via one `.map()` over a `[label, value, setter]`
 *      tuple array rather than nine hand-written blocks.
 *
 *      🛑 This migration's own earlier scoping note called this tab "Legal
 *      (GSTIN + policy pages)" — that was WRONG. There is no GSTIN field
 *      here; GSTIN lives entirely on the already-migrated GST tab. This tab
 *      is nine uniform HTML-source fields and nothing else.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema` does not
 *      validate `legalPages` at all (raw HTML, no format to check).
 *
 * WHAT: Flat field names matching the component's own state (`termsHtml`,
 *       `privacyHtml`, …), writing into
 *       `legalPages.{terms,privacy,refundPolicy,shipping,cookies,ethics,
 *       codeOfConduct,cancellation,grievance}` — note several payload keys
 *       do NOT match their field-name prefix 1:1 (`shippingPolicyHtml` →
 *       `shipping`, `conductHtml` → `codeOfConduct`), preserved exactly as
 *       `buildFullPayload()` already wrote them.
 *
 *       `LEGAL_PAGE_FIELDS` is exported alongside the schema so the
 *       component can build its nine identical-shaped custom renderers
 *       (raw `<Textarea className="font-mono">`, not the generator's
 *       default `<FieldTextarea>`, to keep the monospace HTML-source
 *       styling — `FieldTextarea`'s `className` reaches its OUTER wrapper
 *       div only, never the inner `<Textarea>`, so preserving the font
 *       needs the primitive directly) from ONE array instead of nine
 *       hand-written blocks — the same "map over a tuple array" shape the
 *       original JSX already used, not a new pattern invented for this
 *       migration.
 *
 * EXPORTS: siteSettingsLegalFormSchema, type SiteSettingsLegalFormValues,
 *          LEGAL_PAGE_FIELDS
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

const htmlField = (order: number, label: string, sectionRequired?: boolean) =>
  annotate(z.string().optional().or(z.literal("")), {
    section: "legal", sectionLabel: "Legal", sectionRequired,
    order, row: "full", kind: "textarea", label,
  });

export const siteSettingsLegalFormSchema = z.object({
  termsHtml: htmlField(1, "Terms of Service", true),
  privacyHtml: htmlField(2, "Privacy Policy"),
  refundHtml: htmlField(3, "Refund Policy"),
  shippingPolicyHtml: htmlField(4, "Shipping Policy"),
  cookieHtml: htmlField(5, "Cookie Policy"),
  ethicsHtml: htmlField(6, "Our Ethics"),
  conductHtml: htmlField(7, "Code of Conduct"),
  cancellationHtml: htmlField(8, "Cancellation Policy"),
  grievanceHtml: htmlField(9, "Grievance Redressal"),
});

export type SiteSettingsLegalFormValues = z.infer<typeof siteSettingsLegalFormSchema>;

/** Drives the component's nine identical custom `<Textarea>` renderers. */
export const LEGAL_PAGE_FIELDS: {
  name: keyof SiteSettingsLegalFormValues;
  label: string;
}[] = [
  { name: "termsHtml", label: "Terms of Service" },
  { name: "privacyHtml", label: "Privacy Policy" },
  { name: "refundHtml", label: "Refund Policy" },
  { name: "shippingPolicyHtml", label: "Shipping Policy" },
  { name: "cookieHtml", label: "Cookie Policy" },
  { name: "ethicsHtml", label: "Our Ethics" },
  { name: "conductHtml", label: "Code of Conduct" },
  { name: "cancellationHtml", label: "Cancellation Policy" },
  { name: "grievanceHtml", label: "Grievance Redressal" },
];
