/*
 * WHY: Authored six-part procedures for the selling/seller-ops-comms page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE LAST TWO CASES OVERLAP ON PURPOSE. One print surface is the real one and
 * the other is a degraded duplicate of it rendered with no store — two features
 * that look alike is exactly how one of them ships broken and unnoticed, so both
 * are opened and compared rather than either being trusted.
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
  "checklist-selling-seller-ops-comms-seller-addresses-crud": {
    roles: ["seller"],
    startPage: "/store/addresses",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/addresses and read the existing addresses.",
      "Create one: 'QA Address ops-comms', '11 Test Lane', Indore, Madhya Pradesh, 452010, landmark 'Next to the arena'.",
      "Save, RELOAD, and read every field including the landmark.",
      "Edit only the street to '12 Test Lane', save, RELOAD, and read every field again.",
      "Mark it as the default pickup location, save and RELOAD.",
      "Delete it and RELOAD to confirm.",
    ],
    inputs: {
      name: "QA Address ops-comms",
      streetBefore: "11 Test Lane",
      streetAfter: "12 Test Lane",
      landmark: "Next to the arena",
    },
    expectedBehaviour:
      "Create, edit, default-set and delete all persist, and an edit touching one field leaves the others alone. The edit step is the important one: a form that cannot name a field sends undefined for it, and undefined overwrites — which is how the landmark disappeared on every edit.",
    expectedUiState:
      "After each reload the address holds exactly what was typed. Following the street edit, the landmark still reads 'Next to the arena'. A blank landmark after an unrelated edit is the failure.",
    endResult: "The address is deleted by the final step.",
  },
  "checklist-selling-seller-ops-comms-seller-fulfillment-queue": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's fulfillment queue and read the rows.",
      "Read each row's primary label and check it names the ITEM rather than only an order id.",
      "Read every filter offered and select each in turn, reading the rows.",
      "Open one row and read the order it opens.",
      "Check the queue's ordering — whether the oldest unfulfilled order is first.",
    ],
    expectedBehaviour:
      "The queue lists orders needing action, keyed on what the seller has to pack rather than on an identifier they cannot act on. Order documents denormalise the item title and image precisely so a list row needs no extra fetch — a row reading only 'Order {id}' is a row-mapper that never read them.",
    expectedUiState:
      "Each row names the product and shows its thumbnail, with the order id de-emphasised rather than being the whole label. Every filter returns rows or a named empty state. Rows open the order.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-ops-comms-seller-print-center": {
    roles: ["seller"],
    startPage: "/store/print-center",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/print-center and read what it offers.",
      "Select one or more items or orders to print.",
      "Read the preview and check the store's own name, logo and address appear on it.",
      "Generate the printable output and read it.",
      "Check the barcode or code shown resolves to the right product.",
    ],
    expectedBehaviour:
      "The print centre renders with the seller's own store context — name, logo, pickup address — because that context is what makes a label usable. A barcode is derived deterministically from the product id, so the same product always produces the same code.",
    expectedUiState:
      "The preview carries the store's name, logo and address rather than blanks or placeholders. The output includes the selected items. The barcode matches the product it is printed for.",
    endResult:
      "Nothing is persisted by previewing. Do not send anything to a physical printer.",
  },
  "checklist-selling-seller-ops-comms-seller-inventory-print": {
    roles: ["seller"],
    startPage: "/store/print-center",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/print-center and write down what it offers and whether the store context is present.",
      "Open the store's inventory print page.",
      "Write down what IT offers and whether the store context is present.",
      "Compare the two side by side.",
      "Check the sidebar for which of the two is linked.",
    ],
    expectedBehaviour:
      "Only one of these is the real surface. The other renders the same component with no store attached, so it produces a preview with no name, no logo and no address — a page that looks built and yields an unusable label. Two features that look alike is how one ships broken and unnoticed.",
    expectedUiState:
      "One surface carries the full store context and the other does not, or the second no longer exists. Record which is which, and which one the sidebar links to — a sidebar pointing at the degraded copy is the finding.",
    endResult:
      "Read-only; nothing persists. If both render identically and correctly, say so — that is a valid outcome and means the duplicate was resolved.",
  },
};
