/*
 * WHY: `AdminSiteSettingsView`'s EMI tab (⑯, site-wide installment
 *      financing settings) — twelfth tab migrated to the Universal
 *      Template System (Phase 3B, admin site-settings form rebuild,
 *      2026-11-04). Seven `useState` calls.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema.emi` already
 *      validates `surchargePercent`/`surchargeSellerSharePercent`/
 *      `minOrderAmount`; this schema does not duplicate those bounds.
 *
 * WHAT: Flat field names matching the component's own state, writing into
 *       `emi.{enabled,minOrderValue,tenureOptions,tokenPercent,billingDay,
 *       surchargePercentPerMonth,surchargeSellerSharePercent}`.
 *
 *       🛑 CORRECTION to this migration's own earlier scoping note, which
 *       guessed `emiTenureOptionsText` would need "its own parse/join
 *       renderer" — it does NOT. The field itself is a plain comma-
 *       separated STRING at the render layer (`"2,3,4,5,6"`); the
 *       split/parseInt/filter transform into `emi.tenureOptions: number[]`
 *       happens entirely in `buildFullPayload()`'s save step and the
 *       `.join(",")` happens in the hydrate effect, neither of which this
 *       schema or its rendering touches. No custom renderer needed
 *       anywhere in this tab.
 *
 * EXPORTS: siteSettingsEmiFormSchema, type SiteSettingsEmiFormValues
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

export const siteSettingsEmiFormSchema = z.object({
  emiEnabled: annotate(z.boolean(), {
    section: "emi", sectionLabel: "Emi", sectionRequired: true,
    order: 1, row: "full", kind: "toggle", label: "Enable EMI platform-wide",
    help: "A seller must also opt in via their own Payout Settings for EMI to appear at checkout on their items. See the \"How EMI Works\" public page for buyer-facing copy.",
  }),
  emiMinOrderValue: annotate(z.number().min(0), {
    section: "emi", order: 2, label: "Minimum order value (₹)",
    help: "A seller's cart subtotal must exceed this for EMI to appear as an option.",
  }),
  emiTenureOptionsText: annotate(z.string().optional().or(z.literal("")), {
    section: "emi", order: 3, label: "Tenure options (months, comma-separated)",
    help: "e.g. 2,3,4,5,6",
  }),
  emiTokenPercent: annotate(z.number().min(0).max(100), {
    section: "emi", order: 4, label: "Token / down-payment (%)",
    help: "Collected upfront at checkout.",
  }),
  emiBillingDay: annotate(z.number().min(1).max(10), {
    section: "emi", order: 5, label: "Billing day (1–10)",
    help: "Day of month each installment is due.",
  }),
  emiSurchargePercentPerMonth: annotate(z.number().min(0), {
    section: "emi", order: 6, label: "Surcharge (% of principal per month)",
    help: "The 'excess EMI fee' the buyer pays for spreading payment.",
  }),
  emiSurchargeSellerSharePercent: annotate(z.number().min(0).max(100), {
    section: "emi", order: 7, label: "Seller's share of surcharge (%)",
    help: "The rest of the surcharge goes to the platform.",
  }),
});

export type SiteSettingsEmiFormValues = z.infer<typeof siteSettingsEmiFormSchema>;
