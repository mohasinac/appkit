/*
 * WHY: Authored six-part procedures for the search-and-nav/settings-deep-links page.
 * WHAT: 2 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

/*
 * Verified on 2026-09-29, and both cases are right, including the detail most
 * likely to be wrong: the default really IS branding. `activeTab` is
 *
  *   useState(() => { if (typeof window === "undefined") return "branding";
  *                    const requested = new URLSearchParams(...).get("tab");
  *                    return isSiteSettingsTabId(requested) ? requested : "branding"; })
 *
 * so an unknown or empty value falls through to branding with no complaint,
 * which is exactly what the second case asserts. The tab id is validated
 * against the union rather than trusted.
 *
 * 🛑 DO NOT infer the default from the JSX. `about` is the first
 * SettingsTabForm in the file, so reading the markup suggests the page opens
 * there; it does not, because the default is explicit state. The 20 valid ids
 * in declaration order are:
 *
 *   about branding appearance themes announcement seo contact watermark fees
 *   integrations shipping auction limits legal whatsapp notifications
 *   procurement emi gst listings
 *
 * 🛑 AND THE FIRST PAINT IS ALWAYS BRANDING. The initialiser returns branding
 * when `window` is undefined, so the server-rendered tab is branding and the
 * URL's tab is applied on hydration. On a slow load a tester can briefly see
 * Branding before Fees appears. That is the deep link working, not failing,
 * and the case now says so rather than leaving it to be reported.
 *
 * Note `ADMIN_SETTINGS_TABS` is a DIFFERENT registry {actions, navigation} for
 * /admin/settings/*. The guard that matters here is `isSiteSettingsTabId` in
 * site-settings-tabs.ts; chasing the wrong constant leads to a two-tab list.
*/

export const authored: Record<string, AuthoredCase> = {
  "checklist-search-and-nav-settings-deep-links-tab-query-param-opens-that-tab": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site?tab=fees directly in the address bar.",
      "Read which tab is selected, waiting for hydration before judging — the first paint is always Branding.",
      "Open /admin/site?tab=themes directly.",
      "Read which tab is selected.",
      "Open /admin/site with no query parameter.",
      "Read which tab is selected.",
    ],
    inputs: { tab1: "fees", tab2: "themes" },
    expectedBehaviour:
      "The open tab is read from the URL, so a deep link — from search, from a guide, from a colleague's message — lands where it says it will. A page that hard-codes its default ignores the URL entirely and every such link arrives on tab one.",
    expectedUiState:
      "?tab=fees opens the Fees tab with its fields on screen. ?tab=themes opens Themes. With no parameter the page opens on Branding. Two different parameters producing the same tab means the URL is not being read — but a MOMENT of Branding before the requested tab is hydration, not a failure: the server-rendered default is always Branding because the initialiser cannot read the URL without a window.",
    expectedData: { defaultTab: "branding", validTabCount: 20 },
    endResult:
      "Read-only; do not save anything. Nothing persists from opening a tab.",
  },
  "checklist-search-and-nav-settings-deep-links-unknown-tab-falls-back-quietly": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site?tab=nonsense directly in the address bar.",
      "Read which tab is selected and look for any error.",
      "Open /admin/site?tab= with an empty value.",
      "Read which tab is selected.",
    ],
    inputs: { unknownTab: "nonsense" },
    expectedBehaviour:
      "An unrecognised tab value falls back to the default without complaint, because the id is validated against the 20-value union rather than trusted. The realistic cause is a stale bookmark from a tab that has since been renamed, and that is not an error condition — it is a page whose shape changed.",
    expectedUiState:
      "Both URLs open Branding. No error banner, no toast, no empty tab strip and no blank panel. A rejected value must not look like a broken page. Worth trying one more: ?tab=Fees with a capital F, since the guard is an exact match against the union and so should also fall back rather than open Fees.",
    expectedData: { fallbackTab: "branding" },
    endResult: "Read-only; nothing persists.",
  },
};
