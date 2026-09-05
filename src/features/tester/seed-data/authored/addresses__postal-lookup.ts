/*
 * WHY: Authored six-part procedures for the addresses/postal-lookup page.
 * WHAT: 3 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * The three cases are hit / don't-clobber / miss. The miss is the one that
 * matters most: coverage is thinner than India Post's, so an unrecognised code
 * is the COMMON path and has to be a non-event rather than an error state.
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
  "checklist-addresses-postal-lookup-pin-fills-city-and-state": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select India as the country.",
      "Leave the City and State fields empty.",
      "Type 560001 in the PIN code field.",
      "Wait one second without typing anything else.",
      "Read the City and State fields, and read the rest of the form.",
    ],
    inputs: { country: "India", pincode: "560001" },
    expectedBehaviour:
      "A complete PIN code triggers one debounced lookup that fills only City and State. Nothing else on the form moves — a lookup that also rewrites the street or the label is doing more than it was asked and the user has no way to undo it.",
    expectedUiState:
      "Within about half a second City and State are filled with the values for 560001. Every other field holds exactly what it held before, including any name or street already typed. No spinner is left running and no error appears.",
    expectedData: { pincode: "560001" },
    endResult:
      "Nothing is saved unless the form is submitted. Two dead modules once carried the shape of a lookup that had been removed, which is why this looked built long before it was.",
  },
  "checklist-addresses-postal-lookup-lookup-never-overwrites": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select India as the country.",
      "Type Whitefield in the City field FIRST, before touching the PIN code.",
      "Type 560001 in the PIN code field.",
      "Wait one second.",
      "Read the City field.",
    ],
    inputs: { country: "India", city: "Whitefield", pincode: "560001" },
    expectedBehaviour:
      "Autofill only ever lands in an EMPTY field. A lookup that corrects deliberate typing produces a bug the user cannot report — they simply watch their own text disappear and assume they mistyped.",
    expectedUiState:
      "City still reads 'Whitefield' after the lookup completes. State, which was empty, has been filled. Nothing flashes the typed value away and back.",
    expectedData: { city: "Whitefield" },
    endResult:
      "Nothing persists until the form is submitted. 'Whitefield' is chosen because it is a real Bengaluru locality that the 560001 lookup will not return — a city name the lookup agrees with would prove nothing.",
  },
  "checklist-addresses-postal-lookup-lookup-miss-is-a-non-event": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select India as the country.",
      "Type 999999 in the PIN code field.",
      "Wait two seconds and read the whole form.",
      "Type 'QA Address lookup-miss' as the name, '3 Test Lane' as the street, 'Indore' as the city and 'Madhya Pradesh' as the state.",
      "Save the address.",
    ],
    inputs: { country: "India", pincode: "999999", city: "Indore", state: "Madhya Pradesh" },
    expectedBehaviour:
      "An unknown but well-formed code resolves to nothing and the form carries on. The code is still valid — six digits — so it must save; only the convenience lookup missed.",
    expectedUiState:
      "No error banner, no red PIN code field, no disabled Save. City and State stay empty and editable, and the typed values are accepted. The address saves with PIN code 999999.",
    expectedData: { pincode: "999999", saved: true },
    endResult:
      "The address exists in /user/addresses after a reload. Delete it afterwards. Treating a miss as a validation failure would block every address in the many areas the lookup does not cover.",
  },
};
