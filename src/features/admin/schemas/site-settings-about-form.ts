/*
 * WHY: `AdminSiteSettingsView`'s About tab (⓪, overrides the public About
 *      page content) — nineteenth (and last field-by-field) tab migrated
 *      to the Universal Template System (Phase 3B, admin site-settings
 *      form rebuild, 2026-11-04). Seventeen fields: thirteen scalars plus
 *      FOUR repeatable lists (`aboutHowItems`/`aboutValueItems`/
 *      `aboutMilestones`/`aboutTeamMembers`).
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema` does not
 *      validate `aboutContent` at all.
 *
 * WHAT: Flat field names matching the component's own state, all writing
 *       1:1 into `aboutContent.*` (no key renames, unlike most other
 *       migrated tabs).
 *
 *       🛑 The four list fields use the GENERIC `<Repeater>` primitive
 *       (`appkit/src/ui/components/Repeater.tsx`, the same one
 *       `AdminBrandEditorView.faqs` already proves) rather than a
 *       Collector-Drop-style hand-written custom renderer — confirmed by
 *       reading the original JSX that none of these four carry Collector
 *       Drop's special "last row is different" business rule; every item
 *       here is uniformly addable/removable. This is the first tab in the
 *       rollout where the generic Repeater is the right fit rather than a
 *       bespoke renderer.
 *
 *       🛑 Accepted fidelity trade-off: `Repeater.renderRow(row, set)` does
 *       NOT receive the row's index, so the original's "Step 1" / "Value 2"
 *       / "Milestone 3" / "Team member 4" numbered labels above each row
 *       (purely cosmetic, no functional role) could not be reproduced —
 *       `Repeater` places a plain "Remove" button after each row's content
 *       instead of a numbered header with an inline ✕. Not worth forking
 *       the shared primitive, which several OTHER call sites already use
 *       unchanged, for one tab's numbering preference.
 *
 *       🛑 `Repeater.max` is REQUIRED (its own doc comment: "unbounded by
 *       default is how a form becomes a way to break the page it feeds"),
 *       while the original had no cap at all. Picked generous product-sense
 *       ceilings — 6 how-it-works steps, 8 values, 10 milestones, 12 team
 *       members — comfortably above anything a real admin would enter; not
 *       a new restriction in practice, just naming a number the original
 *       left unstated.
 *
 *       `AboutTeamMember.githubUrl` exists on the TYPE but was never
 *       rendered by the original JSX (no GitHub field in the team-member
 *       block) — left unrendered here too, exactly as found, not a new
 *       field this migration is adding.
 *
 * EXPORTS: siteSettingsAboutFormSchema, type SiteSettingsAboutFormValues
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

const aboutHowItemSchema = z.object({
  title: z.string(),
  text: z.string(),
  icon: z.string(),
  tone: z.enum(["indigo", "teal", "amber", "rose"]).optional(),
});

const aboutValueItemSchema = z.object({
  title: z.string(),
  text: z.string(),
  icon: z.string(),
  detail: z.string().optional(),
});

const aboutMilestoneSchema = z.object({
  year: z.string(),
  text: z.string(),
});

const aboutTeamMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  bio: z.string(),
  photoUrl: z.string().optional(),
  isFounder: z.boolean().optional(),
  isDeveloper: z.boolean().optional(),
  githubUrl: z.string().optional(),
});

export const siteSettingsAboutFormSchema = z.object({
  aboutTitle: annotate(z.string().optional().or(z.literal("")), {
    section: "about", sectionLabel: "About", sectionRequired: true,
    order: 1, label: "Hero title",
    help: "Override the About page content. Leave blank to use the platform defaults.",
  }),
  aboutSubtitle: annotate(z.string().optional().or(z.literal("")), {
    section: "about", order: 2, label: "Hero subtitle",
  }),
  aboutMissionTitle: annotate(z.string().optional().or(z.literal("")), {
    section: "about", order: 3, label: "Mission section title",
  }),
  aboutMissionText: annotate(z.string().optional().or(z.literal("")), {
    section: "about", order: 4, row: "full", kind: "textarea", label: "Mission text",
  }),

  aboutHowItWorksTitle: annotate(z.string().optional().or(z.literal("")), {
    section: "how-it-works", sectionLabel: "How it works", order: 1,
    label: '"How it works" section title',
  }),
  aboutHowItems: annotate(z.array(aboutHowItemSchema), {
    section: "how-it-works", order: 2, row: "full", label: "Steps",
  }),

  aboutValuesTitle: annotate(z.string().optional().or(z.literal("")), {
    section: "values", sectionLabel: "Values", order: 1, label: "Values section title",
  }),
  aboutValuesSubtitle: annotate(z.string().optional().or(z.literal("")), {
    section: "values", order: 2, label: "Values section subtitle",
    help: "Optional intro line under the heading.",
  }),
  aboutValueItems: annotate(z.array(aboutValueItemSchema), {
    section: "values", order: 3, row: "full", label: "Values",
  }),

  aboutMilestonesTitle: annotate(z.string().optional().or(z.literal("")), {
    section: "milestones", sectionLabel: "Milestones", order: 1, label: "Milestones section title",
  }),
  aboutMilestones: annotate(z.array(aboutMilestoneSchema), {
    section: "milestones", order: 2, row: "full", label: "Milestones",
  }),

  aboutTeamTitle: annotate(z.string().optional().or(z.literal("")), {
    section: "team", sectionLabel: "Team", order: 1, label: "Team section title",
  }),
  aboutTeamSubtitle: annotate(z.string().optional().or(z.literal("")), {
    section: "team", order: 2, label: "Team section subtitle",
  }),
  aboutTeamMembers: annotate(z.array(aboutTeamMemberSchema), {
    section: "team", order: 3, row: "full", label: "Team members",
  }),

  aboutCtaTitle: annotate(z.string().optional().or(z.literal("")), {
    section: "cta", sectionLabel: "CTA banner", order: 1, label: "CTA banner title",
  }),
  aboutCtaSell: annotate(z.string().optional().or(z.literal("")), {
    section: "cta", order: 2, label: "Sell CTA copy",
  }),
  aboutCtaShop: annotate(z.string().optional().or(z.literal("")), {
    section: "cta", order: 3, label: "Shop CTA copy",
  }),
});

export type SiteSettingsAboutFormValues = z.infer<typeof siteSettingsAboutFormSchema>;
