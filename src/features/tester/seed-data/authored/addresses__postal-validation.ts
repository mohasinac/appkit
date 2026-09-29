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

/*
 * Verified against the country registry on 2026-09-29. Every rule these three
 * cases assert is real, and the exact patterns are worth having here so a
 * tester can tell a rejected value from a rejected FORMAT:
 *
 *   IN  /^[1-9]\d{5}$/                      label 'PIN code'
 *   CA  /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i       label 'Postal code'
 *   AE  postalPattern: null                 label 'Postal code'
 *
 * `isValidPostalCode` falls back to a length check of POSTAL_MIN 3 to
 * POSTAL_MAX 12 when a country has no pattern, and it is ONE function used by
 * every form and every route, so the client and the server cannot disagree.
 * An empty string is never valid there, deliberately: required-ness is the
 * caller's business, but a blank is not a postal code — and letting it pass is
 * how the client rule came to disagree with the server in the first place.
 *
 * 🛑 CANADA HAS A STATE PICKER TOO. `hasStates: true` and SUBDIVISIONS holds
 * IN, US, CA and AU, so 'Ontario' is SELECTED from a list rather than typed.
 * The UAE has neither a pattern nor subdivisions, so its state field is free
 * text — which is why that case leaves it alone.
 *
 * Note 560001 satisfies the India pattern because it starts with 5; a code
 * beginning 0 would not, which is the one edge the pattern encodes beyond
 * length.
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
      "Type 'QA Address letters-rejected' as the name, '4 Test Lane' as the street and 'Indore' as the city, then SELECT 'Madhya Pradesh' from the 'State / region' picker.",
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
      "Type K1A 0B1 in that field, then fill the name 'QA Address country-rule', the street '5 Test Lane' and the city 'Ottawa', and SELECT 'Ontario' from the 'State / region' picker — Canada has one too.",
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
    inputs: {
      country: "United Arab Emirates",
      firstCode: "00000",
      secondCode: "ABC-1234",
      postalMin: 3,
      postalMax: 12,
    },
    expectedBehaviour:
      "For a country with no known format any code of 3 to 12 characters is accepted, which is the POSTAL_MIN and POSTAL_MAX fallback in the one shared validator. A postal rule exists to catch a typo, never to refuse a real address whose pattern we simply do not have — and an EMPTY code is still refused, because a blank is not a postal code in any country.",
    expectedUiState:
      "Both codes save without an error. The field is not marked red and Save is never disabled. What must not happen is India's six-digit rule being applied by default to a country it does not describe.",
    expectedData: { bothCodesAccepted: true },
    endResult:
      "The address holds ABC-1234 after a reload. Delete it afterwards.",
  },
};
