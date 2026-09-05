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

export const authored: Record<string, AuthoredCase> = {
  "checklist-search-and-nav-settings-deep-links-tab-query-param-opens-that-tab": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site?tab=fees directly in the address bar.",
      "Read which tab is selected.",
      "Open /admin/site?tab=themes directly.",
      "Read which tab is selected.",
      "Open /admin/site with no query parameter.",
      "Read which tab is selected.",
    ],
    inputs: { tab1: "fees", tab2: "themes" },
    expectedBehaviour:
      "The open tab is read from the URL, so a deep link — from search, from a guide, from a colleague's message — lands where it says it will. A page that hard-codes its default ignores the URL entirely and every such link arrives on tab one.",
    expectedUiState:
      "?tab=fees opens the Fees tab with its fields on screen. ?tab=themes opens Themes. With no parameter the page opens on Branding. Two different parameters producing the same tab means the URL is not being read.",
    expectedData: { defaultTab: "branding" },
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
      "An unrecognised tab value falls back to the default without complaint. The realistic cause is a stale bookmark from a tab that has since been renamed, and that is not an error condition — it is a page whose shape changed.",
    expectedUiState:
      "Both URLs open Branding. No error banner, no toast, no empty tab strip and no blank panel. A rejected value must not look like a broken page.",
    expectedData: { fallbackTab: "branding" },
    endResult: "Read-only; nothing persists.",
  },
};
