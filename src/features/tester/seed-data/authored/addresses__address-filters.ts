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

/*
 * 🛑 THERE IS NO FILTER DRAWER ON THIS PAGE (rewritten 2026-09-29).
 *
 * The case described a drawer offering exactly two facets, Default and
 * Standing, and asserted that three others had been removed. /user/addresses
 * renders `UserAddressesClient`, which has no drawer, no facets and no filter
 * badge at all. It has two controls, both filtering IN MEMORY over the
 * already-fetched list:
 *
 *   Search  an Input placeholdered 'Name, street, city, state, pincode…'
 *   Label   a FieldSelect, rendered ONLY when at least one address has a
 *           label, offering 'All labels' plus each distinct label found
 *
 * So the case could not be performed: a tester would open a drawer that is not
 * there. Rewritten against the real controls, keeping the intent it was written
 * for — a control that changes nothing is the failure.
 *
 * 🛑 SEARCH DOES NOT COVER THE LABEL. It matches fullName, addressLine1,
 * city, state and postalCode; `label` is deliberately absent from that list,
 * which is what the Label select is for. Typing a label name into Search
 * therefore returns nothing, and that is correct rather than broken search.
 * The case says so, because it is exactly the kind of thing a tester reports.
 *
 * No address is seeded for this buyer, so the case creates the two it needs.
*/

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-addresses-address-filters-filters-actually-filter": {
    roles: ["buyer"],
    startPage: "/user/addresses",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses. No address is seeded for this buyer, so create two — one labelled 'Home' at '7 Test Lane', Indore, Madhya Pradesh, 452010, and one labelled 'Office' at '8 Test Lane', Bengaluru, Karnataka, 560001.",
      "Back on /user/addresses, read the controls above the list: a Search input and a Label select. There is no filter drawer and no filter badge.",
      "Type Indore in Search and read which addresses remain.",
      "Clear Search, type zzzznope, and read the count.",
      "Clear Search. Choose Office in the Label select and read which addresses remain.",
      "Set the Label select back to 'All labels' and confirm both return.",
      "Finally type Office into Search, with the Label select on All labels, and read the result.",
    ],
    inputs: {
      firstLabel: "Home",
      secondLabel: "Office",
      searchHit: "Indore",
      searchMiss: "zzzznope",
    },
    expectedBehaviour:
      "Both controls narrow the list they sit above, and both are in-memory over the already-fetched addresses rather than a refetch. Search matches the name, street, city, state and postal code; the Label select matches the label, which Search deliberately does not cover. A control that changes nothing is the failure this case exists for.",
    expectedUiState:
      "Searching Indore leaves the Indore address and hides the Bengaluru one. 'zzzznope' leaves NONE — that is the control that separates filtering from returning everything. Choosing Office in the Label select leaves only the Office address, and 'All labels' restores both.\n\n🛑 Typing Office into SEARCH returns nothing, and that is CORRECT: search covers name, street, city, state and postal code, not the label. Do not record it as broken search. The Label select does not appear at all until at least one address has a label.",
    expectedData: { searchMissCount: 0, labelFilteredCount: 1 },
    endResult:
      "Both controls are cleared. Delete the two addresses afterwards — the addresses collection is PRESERVE tier and is never wiped between runs, so anything left here accumulates forever."
  },
};
