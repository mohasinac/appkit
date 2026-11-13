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
  /*
   * ── THE PRIZE CLAIM WINDOW ───────────────────────────────────────────────
   *
   * Owner, 2026-11-13: *"make sure that there is a gate, say 7 or 10 days or
   * 15 days I can set, so that no one can claim something after 2-3 years"* —
   * and *"same like expirations."*
   *
   * 🛑 "I CAN SET" IS THE REQUIREMENT, AND IT IS WHY THIS FIELD EXISTS.
   * `prizes.claimWindowDays` was already on the `SiteSettingsDocument` type and
   * already READ by the award handler — with no form field anywhere, so the one
   * person who was promised the setting had no way to reach it. That is the
   * declared-but-unwired shape this codebase keeps producing: the mechanism is
   * built and correct, and the one link around it is missing. A number the
   * owner cannot change is a constant with a database row.
   *
   * ⚠ `.min(1)`, so a stored `0` cannot mean "unlimited". An unbounded claim
   * window is precisely what the gate was asked to prevent, and `0` is the
   * value a cleared number input produces — the easiest accidental way to
   * express it.
   *
   * ⚠ NOT given a shipped default in `DEFAULT_SITE_SETTINGS`. A claim window is
   * a commercial choice, and this file's standing rule is that baking one
   * install's choice into appkit's generic defaults breaks domain independence.
   * Absent falls to the BOUNDED default inside `awardPrize` (never unlimited),
   * so an unset value is safe rather than open.
   */
  prizeClaimWindowDays: annotate(z.number().min(1).max(365), {
    section: "limits", order: 4, label: "Prize claim window (days)",
  }),
});

export type SiteSettingsLimitsFormValues = z.infer<typeof siteSettingsLimitsFormSchema>;
