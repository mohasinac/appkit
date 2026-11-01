/**
 * Phase 10 ("widget descriptors") — the READ-ONLY counterpart to
 * `toggle-catalog.ts` (1A-vi, formerly `common-toggles.ts`). Every entry here
 * is a site-settings value OUTSIDE the closed, write-capable `TOGGLE_CATALOG`
 * registry, made findable on the dashboard without opening a second write
 * path into the 20-tab form.
 *
 * 🛑 Selecting a card never flips anything. It navigates to
 * `/admin/site-settings?tab={tab}#{anchorId}` and shows the CURRENT value as
 * plain text, read from the already-fetched `["admin","site-settings"]`
 * query cache — no new fetch, no new write endpoint, none of the form's
 * cross-field validation (gateway ordering, COD/manual-payment dependencies)
 * touched.
 *
 * Every `anchorId` below is verified against a real `id="setting-*"` literal
 * in `AdminSiteSettingsView.tsx` (2026-11-02) — 13 anchors existed, all
 * reused here; none invented. `tab` is the real `<TabsContent value="...">`
 * each anchor falls inside, read directly off the file rather than guessed
 * from the toggle's apparent subject (payment-gateway toggles are inside the
 * `shipping` tab in this codebase, not a `payments` tab that doesn't exist —
 * confirmed by line range, not assumed from the label).
 *
 * 🛑 `razorpay-enabled`/`phonepe-enabled`/`cashfree-enabled`/`cod-enabled`
 * were REMOVED from here when 1A-vi widened `TOGGLE_CATALOG` from 3 to 18
 * entries — all four are now write-capable toggle entries there, and keeping
 * a second read-only copy with the same id would be exactly the
 * two-registries-disagree risk this file's disjointness check exists to
 * catch.
 *
 * `SETTINGS_PREVIEW_IDS` and `TOGGLE_CATALOG_IDS` must stay disjoint — this
 * is what keeps "exactly one writable path" true. Enforced by
 * `audit-widget-descriptor-sync.mjs` R3, not just by this comment.
 */
import { TOGGLE_CATALOG_IDS } from "./toggle-catalog";

export interface SettingsPreviewDef {
  /** Stable id — the `RecentEntry.settingId` and the search result's dedupe key. */
  id: string;
  /** Literal `id="setting-*"` string this must match inside `AdminSiteSettingsView.tsx`. */
  anchorId: string;
  /** The real `<TabsContent value="...">` the anchor falls inside. */
  tab: string;
  label: string;
  keywords?: string[];
}

export const SETTINGS_PREVIEW: SettingsPreviewDef[] = [
  {
    id: "robots-noindex",
    anchorId: "setting-robots-noindex",
    tab: "seo",
    label: "Robots noindex",
    keywords: ["seo", "search indexing", "google", "site settings"],
  },
  {
    id: "daily-digest",
    anchorId: "setting-daily-digest",
    tab: "notifications",
    label: "Daily status digest",
    keywords: ["digest", "email", "staff", "site settings"],
  },
];

export const SETTINGS_PREVIEW_IDS = SETTINGS_PREVIEW.map((s) => s.id);

/** Build-time + runtime check that the two registries never overlap — see audit R3 for the enforced version. */
export const SETTINGS_PREVIEW_TOGGLE_CATALOG_OVERLAP = SETTINGS_PREVIEW_IDS.filter((id) =>
  (TOGGLE_CATALOG_IDS as string[]).includes(id),
);

export function settingsPreviewById(id: string): SettingsPreviewDef | undefined {
  return SETTINGS_PREVIEW.find((s) => s.id === id);
}
