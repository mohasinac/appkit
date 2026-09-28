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
    startPage: "/store/fulfillment",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/fulfillment and stay on its Queue tab — the page is a two-tab shell, Queue and 'Print centre', and the other tab is a different case.",
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
      "Open /store/print-center and note that it REDIRECTS to /store/fulfillment, carrying the query string with it. Landing on a differently-named page is expected, not a fault.",
      "Switch to the 'Print centre' tab — note the British spelling — and read what it offers.",
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
    startPage: "/store/fulfillment",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/fulfillment, switch to the 'Print centre' tab, and write down what it offers and whether the store context is present — name, logo, pickup address.",
      "Open /store/inventory/print directly by URL. It should NOT resolve: the degraded duplicate was removed when Print Centre became a tab.",
      "Open /store/print-center and confirm it redirects here rather than rendering a second copy.",
      "Read the sidebar and check exactly ONE entry leads to this surface, under whichever name it uses.",
      "Confirm there is no second, store-less print surface reachable from anywhere in the sidebar.",
    ],
    expectedBehaviour:
      "The duplicate is RESOLVED and this case now guards the resolution rather than measuring the gap. /store/inventory/print used to render the same component with no store attached — a preview with no name, no logo and no address, a page that looked built and produced an unusable label. It was removed when Print Centre became a tab of /store/fulfillment, and /store/print-center became a redirect. What must stay true is that exactly one print surface exists and it has the store context.",
    expectedUiState:
      "The Print centre tab carries the store name, logo and pickup address. /store/inventory/print does not resolve. /store/print-center redirects here rather than rendering a second copy. The sidebar offers exactly one route to it. A second print surface reappearing — or this one rendering without store context — is the finding.",
    endResult:
      "Read-only; nothing persists. /store/inventory/print resolving at all is a REGRESSION, not a discovery: it was deliberately deleted, so its return means something reinstated it.",
  },
};
