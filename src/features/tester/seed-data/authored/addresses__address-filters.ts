/*
 * WHY: Authored six-part procedures for the addresses/address-filters page.
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
  "checklist-addresses-address-filters-filters-actually-filter": {
    roles: ["buyer"],
    startPage: "/user/addresses",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses and add a second address named 'QA Address filters-second', '7 Test Lane', Indore, Madhya Pradesh, 452010, if only one exists.",
      "Make sure exactly one of the addresses is marked as the default.",
      "Open the filter drawer and read every facet it offers.",
      "Tick the Default facet and apply.",
      "Read which addresses are listed.",
      "Clear the filter, tick the Standing facet and apply.",
      "Read which addresses are listed.",
    ],
    inputs: { secondAddressName: "QA Address filters-second" },
    expectedBehaviour:
      "Every facet offered reads a field the address document actually has. Three facets — Address Type, Verified and Active — named fields that have never existed on this document, so each compared against an empty string and could never match a row while still counting toward the filter badge.",
    expectedUiState:
      "The drawer offers only Default and Standing. Ticking Default lists only the default address; ticking Standing changes the list too. Address Type, Verified and Active are not offered at all. A facet that changes nothing while incrementing the badge is the exact failure being checked.",
    expectedData: { facetCount: 2 },
    endResult:
      "Nothing persists; filter state lives in the URL. Delete the second address afterwards.",
  },
};
