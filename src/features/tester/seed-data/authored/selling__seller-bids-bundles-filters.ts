/*
 * WHY: Authored six-part procedures for the selling/seller-bids-bundles-filters page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A FILTER CHIP'S id IS PASSED STRAIGHT INTO AN EQUALITY, and the comparison is
 * byte-exact. A chip whose value is a display label, a wrong case, or a status the
 * documents never hold returns zero rows forever with no error anywhere — so every
 * case here reads the chip's ROWS, not merely that the chip responds.
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
  "checklist-selling-seller-bids-bundles-filters-seller-bids-status-filter": {
    roles: ["seller"],
    startPage: "/store/bids",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's bids page and note the total row count with no filter applied.",
      "Read every status chip offered and write the list down.",
      "Select each chip in turn and read the row count and the statuses shown in the rows.",
      "Write down any chip that returns zero rows.",
      "For each such chip, check the unfiltered list for rows carrying that status.",
    ],
    expectedBehaviour:
      "Every chip offered corresponds to a status bids actually hold. The last step is what separates an empty chip from a broken one: a chip returning nothing while the unfiltered list contains rows of that status is a wrong filter value, and it fails silently because a byte-exact equality that matches nothing is not an error.",
    expectedUiState:
      "Each chip either returns rows of its own status, or returns none AND the unfiltered list has none either. A chip that is empty while matching rows are visible unfiltered is the failure, named by chip.",
    expectedData: { chipsEmptyWithMatchingRows: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-bids-bundles-filters-seller-bids-sort-dropdown": {
    roles: ["seller"],
    startPage: "/store/bids",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's bids page and read the sort dropdown's default selection and the row order.",
      "Select each other sort option in turn, reading the row order after each.",
      "Write down any option that does not change the order.",
      "Check that the dropdown's default is one of the options it offers.",
      "Reload with a sort applied and read the order on first paint.",
    ],
    expectedBehaviour:
      "Every sort option reorders the rows. An option whose field is not marked sortable is dropped before the query runs, so the dropdown selection changes and nothing moves. A default that is not among the offered options opens the dropdown with nothing selected.",
    expectedUiState:
      "Each option produces a visibly different order. The default is one of the listed options. After the reload the rows are in the selected order on first paint, not the default order that then re-sorts.",
    expectedData: { inertSortOptions: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-bids-bundles-filters-seller-bids-bidder-search": {
    roles: ["seller"],
    startPage: "/store/bids",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's bids page and read a bidder identifier from any row.",
      "Read the search box's placeholder or helper text for how it matches.",
      "Type that identifier exactly and read the results.",
      "Clear the box, type only the first half of it, and read the results.",
      "Clear the box, type zzzznope, and read the results.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Bidder identities are PII-encrypted at rest, so they can only be matched exactly through a blind index — a partial match is impossible by design rather than by omission. The box must SAY so, because otherwise a partial search returning nothing reads as broken.",
    expectedUiState:
      "The exact identifier returns its rows. The partial one returns none, and the box states that matching is exact. 'zzzznope' returns none rather than the full list.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "Read-only. Bidder names shown in these rows should be masked — an unmasked full name here is a separate and more serious finding than anything about the search.",
  },
  "checklist-selling-seller-bids-bundles-filters-seller-bundles-active-filter": {
    roles: ["seller"],
    startPage: "/store/bundles",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's bundles page and note the total row count.",
      "Read the active filter's options.",
      "Select active and read the rows and their states.",
      "Select inactive and read the rows and their states.",
      "Confirm the two counts add up to the unfiltered total.",
      "Open one bundle and check its member list is populated rather than reading zero items.",
    ],
    expectedBehaviour:
      "The two filter states partition the list, so their counts sum to the total. The member check matters separately: a bundle's members are mirrored onto the bundle for index-friendly reads, and a reader trusting only that mirror shows an empty bundle whenever a write path forgot to update it.",
    expectedUiState:
      "Active and inactive each return their own rows and the counts sum to the unfiltered total. The opened bundle lists its members with titles and images rather than reading '0 items'.",
    expectedData: { partitionSumsToTotal: true },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
};
