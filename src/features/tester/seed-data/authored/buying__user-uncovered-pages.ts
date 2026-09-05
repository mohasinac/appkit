/*
 * WHY: Authored six-part procedures for the buying/user-uncovered-pages page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Four buyer routes the sweep found with no case naming them anywhere. Three are
 * "editors that are also pages" — opened by URL, they must render with the form
 * ALREADY open, because a page whose only content is a closed drawer is a blank
 * screen with a working URL.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const SIGN_IN_BUYER = "Sign in as rehan.sheikh@gmail.com / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-buying-user-uncovered-pages-user-preorders-renders": {
    roles: ["buyer"],
    startPage: "/user/pre-orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/pre-orders.",
      "Read the pre-orders listed, or the empty state.",
      "For each, read its production status and its expected delivery date.",
      "Open one and check it links back to the listing it was placed against.",
      "Check the deposit paid is distinguished from the full price.",
    ],
    expectedBehaviour:
      "A buyer's pre-orders are listed with the two things that make them different from an ordinary order — production status and expected delivery. A pre-order is bought at a deposit, so showing only the full price misstates what was charged and what is still owed.",
    expectedUiState:
      "Each pre-order shows its production status, its expected delivery date and its deposit against the full price, and links to its listing. An empty state is acceptable only if the account has none.",
    endResult: "Read-only.",
  },
  "checklist-buying-user-uncovered-pages-user-support-new-renders": {
    roles: ["buyer"],
    startPage: "/user/support/new",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/support/new directly by URL.",
      "Read whether the ticket form is already open or whether the page is blank.",
      "Close or cancel the form.",
      "Read where the browser lands.",
      "Check it is the ticket list rather than a dead route.",
    ],
    expectedBehaviour:
      "An editor that is also a page opens with its form already showing, and cancelling lands on the list it belongs to. A page whose content is a closed drawer is blank with a working URL — nothing errors, and there is nothing to click.",
    expectedUiState:
      "The form is open on arrival, and cancelling lands on /user/support. A blank page, or a cancel that leaves the browser nowhere, are both findings.",
    endResult: "No ticket is created.",
  },
  "checklist-buying-user-uncovered-pages-user-catalogue-new-renders": {
    roles: ["buyer"],
    startPage: "/user/catalogue/new",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/catalogue/new directly by URL.",
      "Check the form is already open.",
      "Fill it with the title 'QA Catalogue Probe' and upload /test-media/sample-image.png.",
      "Save it.",
      "Read where the browser lands and check the item is in the catalogue list.",
      "Reload and check it is still there, then delete it.",
    ],
    inputs: { title: "QA Catalogue Probe", imagePath: "/test-media/sample-image.png" },
    expectedBehaviour:
      "The form opens on arrival, saves, and the saved item appears in the list. Reloading is the whole check — an item that never reached storage looks identical until then, and an image that was never finalised renders once and breaks later.",
    expectedUiState:
      "The item is listed with its photo after the save and still after the reload. A broken image on the second load is the finalise failure.",
    endResult: "The QA catalogue item is deleted.",
  },
  "checklist-buying-user-uncovered-pages-user-addresses-add-renders": {
    roles: ["buyer"],
    startPage: "/user/addresses/add",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/addresses/add directly by URL.",
      "Check the form is already open.",
      "Fill it with the name 'QA Address Probe', phone 9876543210, line 1 '221B Test Street', landmark 'Opposite the QA park', postal code 560001.",
      "Save it.",
      "Read the address list and find the new entry.",
      "Open it for edit and check the landmark survived.",
      "Delete the address afterwards.",
    ],
    inputs: {
      fullName: "QA Address Probe",
      phone: "9876543210",
      addressLine1: "221B Test Street",
      landmark: "Opposite the QA park",
      postalCode: "560001",
    },
    expectedBehaviour:
      "Every field the form collects is written and read back — the landmark specifically, because a form missing a field the server accepts sends nothing for it on every edit and quietly drops whatever was there. Reopening the saved address for edit is the only way to see it.",
    expectedUiState:
      "The address appears in the list, and reopening it for edit shows all five values including the landmark. A landmark that is blank on reopen is the finding.",
    endResult: "The QA address is deleted.",
  },
};
