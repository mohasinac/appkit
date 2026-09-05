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

export const authored: Record<string, AuthoredCase> = {
  "checklist-search-and-nav-header-search-search-finds-maintenance-toggle": {
    roles: ["admin"],
    startPage: "/",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open / and click into the header search.",
      "Type maintenance.",
      "Read the results.",
      "Click the maintenance quick link.",
      "Read which tab of Site Settings is open and what is on screen.",
    ],
    inputs: { query: "maintenance" },
    expectedBehaviour:
      "Search reaches individual SETTINGS, not just screens. No nav item is called Maintenance, so a label-matching search returns nothing for this word — and the toggle lives on tab one of nineteen with no way to find it but hunting.",
    expectedUiState:
      "A quick link for maintenance appears in the results. Clicking it opens Site Settings on the Branding tab with the Maintenance mode toggle scrolled into view. Landing on Site Settings' first tab with the toggle somewhere off screen is a FAIL, not a partial pass.",
    expectedData: { resultCount: 1 },
    endResult:
      "Read-only; do not flip the toggle. Turning on maintenance mode would take the site down for every other case in the run.",
  },
  "checklist-search-and-nav-header-search-search-finds-by-what-it-does": {
    roles: ["admin"],
    startPage: "/",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open / and click into the header search.",
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
    startPage: "/",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open / and click into the header search.",
      "Type orders.",
      "Read the results in order from the top.",
    ],
    inputs: { query: "orders" },
    expectedBehaviour:
      "An exact label match outranks an entry that merely mentions the word in its description. With no ranking at all the results fall into alphabetical order and the thing actually called Orders can land ninth.",
    expectedUiState:
      "The entry named Orders is first. Guides and settings whose descriptions mention orders appear below it. Orders appearing anywhere but first is the failure, even though it is present.",
    expectedData: { exactMatchPosition: 1 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-search-and-nav-header-search-search-never-shows-what-you-cannot-reach": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!, an ordinary buyer.",
      "Open / and click into the header search.",
      "Type users and read every result.",
      "Clear the box, type payouts and read every result.",
      "Clear the box, type maintenance and read every result.",
      "Clear the box, type orders and read every result.",
    ],
    inputs: { query1: "users", query2: "payouts", query3: "maintenance", query4: "orders" },
    expectedBehaviour:
      "Results are filtered by what this viewer may actually reach. The labels alone are a site map of the admin panel, so an entry a buyer cannot open is one they must not be shown — hiding the destination behind a 403 is not enough.",
    expectedUiState:
      "'users', 'payouts' and 'maintenance' return no admin entries at all — not greyed out, not present-but-unclickable, absent. 'orders' still returns the buyer's OWN orders page, which proves the filter is scoping rather than simply returning nothing.",
    expectedData: { adminResultsForBuyer: 0 },
    endResult:
      "Read-only; nothing persists. The fourth query is the control — a search that returned nothing for everything would pass the first three for the wrong reason.",
  },
};
