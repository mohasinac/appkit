/*
 * WHY: `AdminSiteSettingsView`'s Watermark tab (⑥) — fifth tab migrated to
 *      the Universal Template System (Phase 3B, admin site-settings form
 *      rebuild, 2026-11-04), same pattern as the four before it.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here).
 *
 * WHAT: Flat field names matching the component's own state
 *       (`watermarkType`, `watermarkOffsetX`, …), not the nested
 *       `watermark.*` keys the save payload uses. `watermarkText` /
 *       `watermarkImageUrl` are mutually exclusive on `watermarkType`;
 *       `watermarkOffsetX`/`Y` only apply when `watermarkUseCustomOffset` is
 *       on — both expressed as `when` predicates, mirroring the original
 *       hand-written `watermarkType === "text" ? … : …` ternary and
 *       `disabled={watermarkUseCustomOffset}` / `{watermarkUseCustomOffset &&
 *       …}` conditionals.
 *
 * EXPORTS: siteSettingsWatermarkFormSchema, type SiteSettingsWatermarkFormValues
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

export const siteSettingsWatermarkFormSchema = z.object({
  watermarkType: annotate(z.enum(["text", "image"]), {
    section: "watermark", sectionLabel: "Watermark", sectionRequired: true,
    order: 1, row: "full", label: "Watermark type",
  }),
  /** Defaults to the site domain when blank — set from the component's own state, not here. */
  watermarkText: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
    section: "watermark", order: 2, row: "full", label: "Watermark text",
    when: (values) => values.watermarkType !== "image",
  }),
  watermarkImageUrl: annotate(z.string().optional().or(z.literal("")), {
    section: "watermark", order: 3, row: "full", label: "Watermark image",
    when: (values) => values.watermarkType === "image",
  }),
  watermarkSize: annotate(z.number().min(5).max(100), {
    section: "watermark", order: 4, row: "pair", label: "Size",
    help: "% of image width.",
  }),
  watermarkOpacity: annotate(z.number().min(5).max(100), {
    section: "watermark", order: 5, row: "pair", label: "Opacity",
    help: "% opacity.",
  }),
  watermarkPosition: annotate(
    z.enum(["center", "top-left", "top-right", "bottom-left", "bottom-right"]),
    { section: "watermark", order: 6, row: "full", label: "Position" },
  ),
  watermarkUseCustomOffset: annotate(z.boolean(), {
    section: "watermark", order: 7, row: "full", kind: "toggle",
    label: "Use a custom X/Y offset instead",
  }),
  watermarkOffsetX: annotate(z.number().min(-45).max(45), {
    section: "watermark", order: 8, row: "pair", label: "X offset (%)",
    help: "+ right / − left of center.",
    when: (values) => Boolean(values.watermarkUseCustomOffset),
  }),
  watermarkOffsetY: annotate(z.number().min(-45).max(45), {
    section: "watermark", order: 9, row: "pair", label: "Y offset (%)",
    help: "+ down / − up from center.",
    when: (values) => Boolean(values.watermarkUseCustomOffset),
  }),
});

export type SiteSettingsWatermarkFormValues = z.infer<typeof siteSettingsWatermarkFormSchema>;
