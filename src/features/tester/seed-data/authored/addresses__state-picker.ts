/*
 * WHY: Authored six-part procedures for the addresses/state-picker page.
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
  "checklist-addresses-state-picker-state-is-a-picker-for-india": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select India as the country.",
      "Click the State field and try to type free text into it.",
      "Type karn in the picker's search box and read the options offered.",
      "Select Karnataka.",
      "Change the country to United Arab Emirates.",
      "Click the State field again and try to type free text.",
    ],
    inputs: { country: "India", stateSearch: "karn", state: "Karnataka" },
    expectedBehaviour:
      "Where a country's regions are enumerated, State is a searchable picker; where they are not, it is a plain text box. The picker is what stops one column holding 'Karnataka', 'karnataka' and 'KA' depending on which screen created the row — which is what happened while this form and the seller drawer wrote free text into the same field the admin editor filled from a 36-option list.",
    expectedUiState:
      "With India selected, State cannot be typed into freely and searching 'karn' narrows a list of India's 36 states and union territories to Karnataka. With United Arab Emirates selected, State becomes an ordinary text input that accepts anything.",
    expectedData: { indiaStateOptionCount: 36 },
    endResult:
      "Nothing persists unless the form is submitted. A picker offering 28 or 29 options is missing the union territories.",
  },
  "checklist-addresses-state-picker-changing-country-clears-state": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select India as the country.",
      "Select Karnataka in the State picker.",
      "Change the country to Canada.",
      "Read the State field.",
      "Change the country back to India and read it again.",
    ],
    inputs: { firstCountry: "India", state: "Karnataka", secondCountry: "Canada" },
    expectedBehaviour:
      "Changing the country clears the state, because a state only means something inside the country it belongs to. An address carrying Karnataka under Canada is a row nothing can group, rate for shipping, or tax correctly.",
    expectedUiState:
      "After switching to Canada the State field is empty and offers Canadian provinces. Switching back to India leaves it empty too — it does not restore 'Karnataka' from before, which would reintroduce the mismatch the clear exists to prevent.",
    expectedData: { stateAfterCountryChange: "" },
    endResult:
      "Nothing persists unless the form is submitted. A retained 'Karnataka' under Canada is the failure.",
  },
};
