/*
 * WHY: Authored six-part procedures for the search-and-nav/header-search page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Every one of these searches for a word that does NOT appear in the label of
 * what it should find. That is the point of the whole page: matching labels is
 * the behaviour being replaced, so a query whose answer is in its own label
 * cannot tell the two apart.
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
 * 🛑 THIS IS THE SIDEBAR SEARCH, NOT THE HEADER SEARCH (corrected 2026-09-29).
 *
 * All four cases said to open / and click into the header search. Two things
 * are wrong with that. The public header's Search is a CATALOGUE search: it
 * carries a resource-type dropdown and navigates to a listing URL with ?q=,
 * so it never returns a settings toggle or an admin screen. And on / there is
 * no admin sidebar at all.
 *
 * The search these cases describe is `useSidebarSearch`, mounted in each
 * portal's sidebar, and its own header states exactly what they assert:
 *
 *   "refund found nothing, because the screen is called Payouts. postcode
 *    found nothing, because the field is called PIN code. maintenance found
 *    nothing, because that toggle lives inside Site Settings."
 *
 * and the ranking rule they turn on:
 *
 *   "A label hit beats a keyword hit beats a description hit, so typing
 *    orders puts Orders above the guide that merely mentions orders."
 *
 * Groups keep their declared order deliberately, so ranking is WITHIN a group.
 * A case expecting one flat list ranked end to end would misread that.
 *
 * 🛑 AND THERE IS A NAV GROUP TITLED 'Maintenance', with Overview, Server
 * Errors, Client Errors and Function Errors under it. The first case claimed
 * no nav item is called Maintenance and that a label-matching search returns
 * nothing for the word. Both are false, and the corrected case uses that: the
 * query must return BOTH the Maintenance group and the Site Settings entry
 * whose keywords carry 'maintenance mode', which is the harder half.
 *
 * The Maintenance mode toggle really is on the Branding tab, verified at
 * AdminSiteSettingsView's `setting-maintenance-mode` anchor. But that is tab
 * TWO of TWENTY, not one of nineteen.
 *
 * Case 4's filter is by CONSTRUCTION rather than by a permission check — each
 * portal's sidebar is built from its own nav groups, so a buyer's sidebar has
 * no admin items to surface. That is a stronger guarantee than filtering, and
 * the case now says so instead of implying a runtime check it does not make.
*/

export const authored: Record<string, AuthoredCase> = {
  "checklist-search-and-nav-header-search-search-finds-maintenance-toggle": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and click into the sidebar search box.",
      "Type maintenance.",
      "Read the results.",
      "Read whether BOTH the Maintenance nav group and the Site Settings entry are returned, then click the Site Settings entry.",
      "Read which tab of Site Settings opens and whether the Maintenance mode toggle is on screen.",
    ],
    inputs: { query: "maintenance" },
    expectedBehaviour:
      "Search reaches individual SETTINGS, not just screens. There IS a nav group called Maintenance, so the word finds those pages on its label alone — the harder half is the Site Settings entry, which matches only through its keywords, and whose Maintenance mode toggle sits on tab two of twenty with no way to find it but hunting.",
    expectedUiState:
      "The results include the Maintenance nav group AND the Site Settings entry. Opening Site Settings lands on the Branding tab with the Maintenance mode toggle on screen. Landing on the About tab, which is the first of twenty, with the toggle somewhere below is a FAIL rather than a partial pass. Returning only the Maintenance pages and not Site Settings means keyword matching is not running — that is the finding this case exists for.",
    expectedData: { siteSettingsReturned: true, maintenanceGroupReturned: true },
    endResult:
      "Read-only; do not flip the toggle. Turning on maintenance mode would take the site down for every other case in the run.",
  },
  "checklist-search-and-nav-header-search-search-finds-by-what-it-does": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and click into the sidebar search box.",
      "Type refund and read the results.",
      "Clear the box, type postcode and read the results.",
      "Clear the box, type cod and read the results.",
      "Clear the box, type zzzznope and read the results.",
    ],
    inputs: { query1: "refund", query2: "postcode", query3: "cod", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Entries carry a description and keywords, so a user who knows what they want to DO finds the screen without knowing what it is called. None of these three words appears in the label of what it finds.",
    expectedUiState:
      "'refund' returns Payouts. 'postcode' returns Addresses. 'cod' returns the Cash on delivery toggle. 'zzzznope' returns an empty state — the control that proves the box is matching rather than listing everything.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-search-and-nav-header-search-search-ranks-exact-first": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and click into the sidebar search box.",
      "Type orders.",
      "Read the results in order from the top.",
    ],
    inputs: { query: "orders" },
    expectedBehaviour:
      "An exact label match outranks a keyword hit, which outranks a description hit. With no ranking the results fall into declaration order and the thing actually called Orders can land well down the list. Ranking is WITHIN each group — groups keep their declared order on purpose, so that the sidebar does not rearrange itself under the reader while they type.",
    expectedUiState:
      "Within its own group, the entry named Orders is first. Guides and settings whose descriptions merely mention orders rank below it, inside their own groups. Orders appearing below a description-only match IN THE SAME GROUP is the failure, even though it is present. Do not expect one flat list — groups are not reordered by score.",
    expectedData: { exactMatchPosition: 1 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-search-and-nav-header-search-search-never-shows-what-you-cannot-reach": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!, an ordinary buyer.",
      "Open /user and click into the sidebar search box — a buyer has a user sidebar, not an admin one.",
      "Type users and read every result.",
      "Clear the box, type payouts and read every result.",
      "Clear the box, type maintenance and read every result.",
      "Clear the box, type orders and read every result.",
    ],
    inputs: { query1: "users", query2: "payouts", query3: "maintenance", query4: "orders" },
    expectedBehaviour:
      "A buyer can never surface an admin entry, and the reason is stronger than filtering: each portal builds its sidebar from its OWN nav groups, so there are no admin items in a buyer's list to match against. The labels alone would be a site map of the admin panel, so absence by construction is the right answer — hiding the destination behind a 403 would not be.",
    expectedUiState:
      "'users', 'payouts' and 'maintenance' return no admin entries at all — not greyed out, not present-but-unclickable, absent. 'orders' still returns the buyer's OWN orders page, which is the control: a search returning nothing for everything would pass the first three for the wrong reason.",
    expectedData: { adminResultsForBuyer: 0 },
    endResult:
      "Read-only; nothing persists. The fourth query is the control — a search that returned nothing for everything would pass the first three for the wrong reason.",
  },
};
