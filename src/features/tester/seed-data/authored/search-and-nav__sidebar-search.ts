/*
 * WHY: Authored six-part procedures for the search-and-nav/sidebar-search page.
 * WHAT: 1 case, keyed by full checklist id.
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
  "checklist-search-and-nav-sidebar-search-sidebar-search-matches-description": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and read the sidebar's group headings in order.",
      "Type fraud in the sidebar search box.",
      "Read which entries remain and which groups they sit under.",
      "Clear the box and type zzzznope.",
      "Read the sidebar.",
      "Clear the box and read the group order again.",
    ],
    inputs: { query: "fraud", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The filter matches a screen's description and keywords, not only its label. Matching on the label alone means only a screen with 'fraud' in its name survives the query — and none is named that.",
    expectedUiState:
      "'fraud' leaves Scam Registry, Address Clusters and Payment Clusters visible, each still under its own group heading. Groups keep their normal order; only their contents narrow. 'zzzznope' empties the sidebar rather than leaving it unfiltered. Clearing the box restores every group in the original order.",
    expectedData: { nonsenseVisibleCount: 0 },
    endResult:
      "Nothing persists; the filter is local to the sidebar and resets on reload.",
  },
};
