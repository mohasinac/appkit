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

/*
 * Verified against the source on 2026-09-29; both cases assert what the code
 * does, and the counts they turn on are exact:
 *
 *   INDIA  36 options (28 states + 8 union territories)
 *   CA     13 options (10 provinces + 3 territories)
 *
 * `AddressLocationFields` renders a `PaginatedSelectField` labelled
 * 'State / region' whenever `subdivisionsFor(country)` is non-empty, and a
 * plain `FieldInput` with the same label otherwise. SUBDIVISIONS covers IN, US,
 * CA and AU, so those four get the picker and every other country gets free
 * text. The picker is searchable — it is a PaginatedSelect, which this codebase
 * requires for anything over five options.
 *
 * Changing the country clears the state in one line, with its reason beside it:
 * `onChange({ country: next, state: "" })`, because 'Karnataka' is not a
 * Canadian province. It fires on EVERY country change, so switching back to
 * India clears it again rather than restoring the earlier value.
 *
 * 🛑 The field's label is 'State / region', not 'State'. Both cases now use
 * the real label, since a tester searching for a field called State on a form
 * that has no such label is looking for something that is not there.
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
      "Click the 'State / region' field and try to type free text into it.",
      "Type karn in the picker's search box and read the options offered.",
      "Select Karnataka.",
      "Change the country to United Arab Emirates.",
      "Click 'State / region' again and try to type free text.",
    ],
    inputs: { country: "India", stateSearch: "karn", state: "Karnataka" },
    expectedBehaviour:
      "Where a country's regions are enumerated, State is a searchable picker; where they are not, it is a plain text box. The picker is what stops one column holding 'Karnataka', 'karnataka' and 'KA' depending on which screen created the row — which is what happened while this form and the seller drawer wrote free text into the same field the admin editor filled from a 36-option list.",
    expectedUiState:
      "With India selected, 'State / region' cannot be typed into freely and searching 'karn' narrows a list of India's 36 states and union territories to Karnataka. With United Arab Emirates selected the same label becomes an ordinary text input that accepts anything, because the UAE has no subdivisions in the registry.",
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
      "Select Karnataka in the 'State / region' picker.",
      "Change the country to Canada.",
      "Read the 'State / region' field, and count the options it now offers.",
      "Change the country back to India and read it again.",
    ],
    inputs: {
      firstCountry: "India",
      state: "Karnataka",
      secondCountry: "Canada",
      canadaOptionCount: 13,
    },
    expectedBehaviour:
      "Changing the country clears the state, because a state only means something inside the country it belongs to. An address carrying Karnataka under Canada is a row nothing can group, rate for shipping, or tax correctly.",
    expectedUiState:
      "After switching to Canada 'State / region' is empty and offers 13 Canadian options, its 10 provinces and 3 territories — an emptied field still listing India's 36 would mean the clear ran and the option source did not. Switching back to India leaves it empty too: the clear fires on every country change and does not restore 'Karnataka', which would reintroduce the mismatch it exists to prevent.",
    expectedData: { stateAfterCountryChange: "", canadaOptionCount: 13 },
    endResult:
      "Nothing persists unless the form is submitted. A retained 'Karnataka' under Canada is the failure.",
  },
};
