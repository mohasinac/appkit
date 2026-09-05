/*
 * WHY: Authored six-part procedures for the addresses/postal-validation page.
 * WHAT: 3 case(s), keyed by full checklist id.
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
  "checklist-addresses-postal-validation-letters-rejected-on-the-field": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select India as the country.",
      "Type 'QA Address letters-rejected' as the name, '4 Test Lane' as the street, 'Indore' as the city and 'Madhya Pradesh' as the state.",
      "Type abcdef in the PIN code field.",
      "Click Save.",
      "Read where the error appears.",
    ],
    inputs: { country: "India", pincode: "abcdef" },
    expectedBehaviour:
      "The format is checked in the browser against the country's own rule, so the request is never sent. A length-only rule passes 'abcdef' — six characters — which is exactly how one admin route treated it as a valid Indian PIN code.",
    expectedUiState:
      "An error appears directly under the PIN code field naming the format, before any network request. There is no server 400 with nothing marked, and no error banner detached from the field that caused it.",
    expectedData: { saved: false },
    endResult:
      "No address is created. The form keeps the other typed values so the user only has to fix the one field.",
  },
  "checklist-addresses-postal-validation-country-decides-the-rule": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select Canada as the country.",
      "Read the label on the postal code field.",
      "Type K1A 0B1 in that field and fill the rest of the form with 'QA Address country-rule', '5 Test Lane', 'Ottawa' and 'Ontario'.",
      "Click Save.",
      "Open the address for editing, switch the country to India, and type K1A 0B1 in the PIN code field.",
      "Type 560001 instead and read the field.",
    ],
    inputs: { canadaPostcode: "K1A 0B1", indiaPincode: "560001" },
    expectedBehaviour:
      "The postal rule and its label both follow the selected country. An India-only six-digit rule made every real Canadian postcode unsaveable from every surface in the app.",
    expectedUiState:
      "With Canada selected the field is labelled 'Postal code' and K1A 0B1 saves. With India selected the field is labelled 'PIN code', K1A 0B1 is rejected, and 560001 is accepted. The rejection is on the field, not a banner.",
    expectedData: { canadaAccepted: true, indiaRejectsCanadaFormat: true },
    endResult:
      "Delete the address afterwards. The reversal is the whole case — a rule that accepts both formats for both countries is not country-aware, it is just permissive.",
  },
  "checklist-addresses-postal-validation-unknown-country-never-blocks": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Select United Arab Emirates as the country.",
      "Type 'QA Address unknown-country' as the name, '6 Test Lane' as the street and 'Dubai' as the city.",
      "Type 00000 in the postal code field.",
      "Click Save.",
      "Open the address for editing, replace the postal code with ABC-1234, and save again.",
    ],
    inputs: { country: "United Arab Emirates", firstCode: "00000", secondCode: "ABC-1234" },
    expectedBehaviour:
      "For a country with no known format any plausible 3-to-12 character code is accepted. A postal rule exists to catch a typo, never to refuse a real address whose pattern we simply do not have.",
    expectedUiState:
      "Both codes save without an error. The field is not marked red and Save is never disabled. What must not happen is India's six-digit rule being applied by default to a country it does not describe.",
    expectedData: { bothCodesAccepted: true },
    endResult:
      "The address holds ABC-1234 after a reload. Delete it afterwards.",
  },
};
