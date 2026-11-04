/*
 * WHY: `AdminSiteSettingsView`'s Appearance tab (②, site-wide background
 *      behind the public shell/dashboard sidebars/opted-in Section/Card) —
 *      eighteenth tab migrated to the Universal Template System (Phase 3B,
 *      admin site-settings form rebuild, 2026-11-04). Two fields
 *      (`lightBg`/`darkBg`), each a structured object rather than a
 *      scalar, because each mode's UI is a TYPE-CONDITIONAL control
 *      (color picker / CSS-gradient textarea / media upload, switched on
 *      the mode's own `type`) plus an overlay toggle+color+opacity and a
 *      LIVE `<BackgroundRenderer>` preview that needs the whole mode's
 *      config at once — none of that decomposes into independent scalar
 *      fields the way every other migrated tab's fields do.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema` does not
 *      validate `background` at all.
 *
 * WHAT: Two fields writing into `background.{light,dark}.{type,value,
 *       overlay:{enabled,color,opacity}}`. `overlayOpacity` stays on its
 *       UI scale (0-100) in this form's state, same as the original — the
 *       ÷100 (save) and ×100-rounded (hydrate) conversions to the stored
 *       0-1 scale happen in `buildFullPayload()`/the hydrate effect,
 *       unchanged by this migration.
 *
 *       Both fields share ONE renderer FACTORY (`buildBackgroundRenderer`,
 *       defined in the component, parameterized by `mode`) rather than two
 *       independent hand-written blocks — the light/dark JSX was already
 *       byte-structurally identical apart from the default swatch color
 *       and the `<BackgroundRenderer mode>` prop, so duplicating it a
 *       second time inside this migration would be adding the exact
 *       drift this codebase's Duplication Decision Framework exists to
 *       prevent, not removing it.
 *
 * EXPORTS: siteSettingsAppearanceFormSchema, type
 *          SiteSettingsAppearanceFormValues, type BackgroundModeValue
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

/*
 * 🛑 A FACTORY, not a shared const — `annotate()` registers metadata keyed
 * by SCHEMA OBJECT IDENTITY (a WeakMap), and returns the same instance it
 * was given. Annotating one shared `z.object()` instance twice (once for
 * `lightBg`, once for `darkBg`) would make the SECOND call silently
 * overwrite the first's registry entry — both fields would then resolve
 * to whichever metadata was written last, since `z.object({lightBg,
 * darkBg})`'s shape would hold the IDENTICAL object reference for both
 * keys. Measured live: `lightBg`'s `sectionRequired: true` was lost this
 * way, so the whole Appearance section defaulted to collapsed instead of
 * open. Call the factory once per field to get two distinct instances.
 */
const backgroundModeSchema = () =>
  z.object({
    type: z.enum(["color", "gradient", "image", "video"]),
    value: z.string(),
    overlayEnabled: z.boolean(),
    overlayColor: z.string(),
    overlayOpacity: z.number().min(0).max(100),
  });

export type BackgroundModeValue = z.infer<ReturnType<typeof backgroundModeSchema>>;

export const siteSettingsAppearanceFormSchema = z.object({
  lightBg: annotate(backgroundModeSchema(), {
    section: "appearance", sectionLabel: "Appearance", sectionRequired: true,
    order: 1, row: "pair", label: "Light mode",
    help: "Sets the background behind the public shell, dashboard sidebars, and any Section/Card that opts into it. Leave the value blank for a plain surface.",
  }),
  darkBg: annotate(backgroundModeSchema(), {
    section: "appearance", order: 2, row: "pair", label: "Dark mode",
  }),
});

export type SiteSettingsAppearanceFormValues = z.infer<typeof siteSettingsAppearanceFormSchema>;
