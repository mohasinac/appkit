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

/*
 * Counted against ADMIN_NAV_GROUPS on 2026-09-29, because the case named three
 * entries and the query returns five, in TWO groups:
 *
 *   Trust & Safety   Banned Addresses   keywords: blocklist, fraud, ban
 *                    Address Clusters   description AND keywords
 *                    Payment Clusters   keywords: fraud, duplicates, linked accounts
 *                    Scam Registry      keywords: fraud, blocklist, report
 *   Guides           Trust & Safety Guide   description AND keywords
 *
 * 🛑 The two the case omitted are the ones a tester would have to judge.
 * Seeing Banned Addresses and a GUIDE come back for 'fraud' looks like
 * over-matching when the case promised three specific entries, and the honest
 * reading is the opposite: the guide is a description-and-keyword hit, which is
 * exactly the behaviour under test. Note Payment METHODS does not match and
 * Payment CLUSTERS does; they are adjacent in the sidebar and easy to confuse.
 *
 * Groups keep their declared order and only their contents narrow, so both
 * headings stay and Trust & Safety stays above Guides.
*/

export const authored: Record<string, AuthoredCase> = {
  "checklist-search-and-nav-sidebar-search-sidebar-search-matches-description": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and read the sidebar's group headings in order.",
      "Type fraud in the sidebar search box.",
      "Read which entries remain, count them, and note which group heading each sits under.",
      "Clear the box and type zzzznope.",
      "Read the sidebar.",
      "Clear the box and read the group order again.",
    ],
    inputs: {
      query: "fraud",
      nonsenseQuery: "zzzznope",
      expectedMatches: 5,
      expectedGroups: 2,
    },
    expectedBehaviour:
      "The filter matches a screen's description and keywords, not only its label. Matching on the label alone means only a screen with 'fraud' in its name survives the query — and none is named that.",
    expectedUiState:
      "'fraud' leaves FIVE entries across TWO groups: Banned Addresses, Address Clusters, Payment Clusters and Scam Registry under Trust & Safety, and Trust & Safety Guide under Guides. The guide is a legitimate hit — it matches on description and keywords, which is the behaviour under test, not over-matching. Payment Methods must NOT appear; only Payment Clusters carries the keyword, and the two sit next to each other. Groups keep their normal order and only their contents narrow. 'zzzznope' empties the sidebar rather than leaving it unfiltered. Clearing the box restores every group in the original order.",
    expectedData: { nonsenseVisibleCount: 0, fraudMatchCount: 5, fraudGroupCount: 2 },
    endResult:
      "Nothing persists; the filter is local to the sidebar and resets on reload.",
  },
};
