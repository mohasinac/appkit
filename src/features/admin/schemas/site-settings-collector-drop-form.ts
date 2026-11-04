/*
 * WHY: `AdminSiteSettingsView`'s Collector Drop tab (⑩) — sixteenth tab
 *      migrated to the Universal Template System (Phase 3B, admin
 *      site-settings form rebuild, 2026-11-04), and the first in this
 *      rollout carrying a genuinely non-flat field: `bidIncrementTiers` is
 *      an array of `{upTo, increment}` rows with real add/remove UI, not a
 *      scalar.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema` does not
 *      validate `collectorDropConfig` at all.
 *
 * WHAT: Flat field names matching the component's own state
 *       (`bidIncrementTiers`, `autoExtendWindow`, `settlementGrace`),
 *       writing into `collectorDropConfig.{bidIncrementTiers,
 *       autoExtendWindowMinutes,settlementGracePeriodHours}`.
 *
 *       🛑 `bidIncrementTiers` keeps its ORIGINAL hand-written add/remove UI
 *       as a custom renderer, rather than the generic `<Repeater>`
 *       primitive (`appkit/src/ui/components/Repeater.tsx`) that every
 *       other repeatable-list field in this codebase uses. `Repeater`'s
 *       contract is "always append, always removable" — this list's real
 *       business rule is narrower: the LAST row is a standing open-ended
 *       tier ("and above") rendered with no input at all, "+ Add tier"
 *       inserts a NEW row BEFORE that last one rather than appending after
 *       it, and Remove is disabled once only one tier remains (there must
 *       always be at least the open-ended floor tier). None of that fits
 *       `Repeater`'s generic shape, so forcing it through would mean either
 *       losing the behavior or forking `Repeater` itself — the custom
 *       renderer preserves the exact original logic instead.
 *
 * EXPORTS: siteSettingsCollectorDropFormSchema, type
 *          SiteSettingsCollectorDropFormValues
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

const bidIncrementTierSchema = z.object({
  upTo: z.number().nullable(),
  increment: z.number(),
});

export const siteSettingsCollectorDropFormSchema = z.object({
  bidIncrementTiers: annotate(z.array(bidIncrementTierSchema), {
    section: "collector-drop", sectionLabel: "Collector Drop", sectionRequired: true,
    order: 1, row: "full", label: "Bid increment tiers",
    help: "The minimum jump a new bid must clear, based on the current bid amount. A seller's per-listing override can require more than the matching tier, but can never undercut it.",
  }),
  autoExtendWindow: annotate(z.number().min(0), {
    section: "collector-drop", order: 2, label: "Auto-extend window (minutes before end)",
    help: "Extend collector drop end time if a bid arrives within this window.",
  }),
  settlementGrace: annotate(z.number().min(1), {
    section: "collector-drop", order: 3, label: "Settlement grace period (hours)",
    help: "Time winner has to pay before the collector drop is re-listed.",
  }),
});

export type SiteSettingsCollectorDropFormValues = z.infer<typeof siteSettingsCollectorDropFormSchema>;
