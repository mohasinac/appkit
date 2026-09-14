/*
 * WHY: Authored six-part procedures for selling/digital-content-delivery.
 * WHAT: 8 cases, keyed by full checklist id.
 *
 * 🛑 THE POOL HAD NO WRITER (Root Cause #103). Its one seller-facing route
 * answered `501 not implemented`, so the pool was empty in every environment,
 * always — and the claim at checkout logged "code pool exhausted" and returned
 * SILENTLY. The order completed normally and the buyer's reveal panel answered
 * 404. Nothing errored, and the seller form's "Code Pool Size" field made the
 * listing advertise stock that had never existed.
 *
 * So the first case here is deliberately about the EMPTY state, and several
 * others assert a number moving rather than a screen appearing: "the reveal
 * page loads" was true throughout the entire period the feature delivered
 * nothing.
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
  "checklist-selling-digital-content-delivery-pool-empty-by-default": {
    roles: ["seller"],
    startPage: "/store/digital-codes",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/digital-codes and open any listing's Edit action.",
      "Scroll to the Code Details section.",
      "Read the pool area beneath the delivery fields.",
    ],
    expectedBehaviour:
      "The editor states what the listing will actually deliver. A listing whose pool is empty can still be bought, and the buyer receives nothing — so the editor has to say that rather than leave the seller to infer it from a Pool Size field they typed themselves.",
    expectedUiState:
      "A pool area is present, showing an available count and an already-delivered count. It says in words that an empty pool delivers nothing.",
    expectedData: { poolSectionVisible: true },
    endResult: "Nothing is saved; the section was only read.",
  },

  "checklist-selling-digital-content-delivery-add-codes-bulk": {
    roles: ["seller"],
    startPage: "/store/digital-codes",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open any digital-code listing's Edit action and find the pool section.",
      "Write down the current available count.",
      "Paste exactly these four lines into the Add codes box: TEST-AAA, TEST-BBB, TEST-AAA, TEST-CCC — one per line.",
      "Press Add codes.",
      "Read the available count.",
      "Reload the page and read the available count again.",
    ],
    inputs: { pasted: "TEST-AAA\nTEST-BBB\nTEST-AAA\nTEST-CCC", distinctCodes: 3 },
    expectedBehaviour:
      "Four lines containing three distinct codes add three entries. A duplicate inside one paste is dropped: re-pasting a list is the obvious way to double a pool by accident, and a duplicated code means a second buyer is sold something already delivered.",
    expectedUiState:
      "The available count rises by exactly 3, and three new rows appear in the list, each reading Code / available.",
    expectedData: { availableDelta: 3 },
    endResult:
      "After the reload the count is still the original plus 3 — the entries are stored, not just rendered.",
  },

  "checklist-selling-digital-content-delivery-buy-then-reveal-code": {
    roles: ["buyer"],
    startPage: "/digital-codes",
    steps: [
      "Sign in as the bot buyer claude-tester@letitrip.in / TempPass123!.",
      "Open /digital-codes and open a listing that shows codes available.",
      "Add it to the cart and complete checkout.",
      "Open /user/digital-codes.",
      "Find the row for what you just bought and press Reveal Code.",
      "Read what appears.",
    ],
    expectedBehaviour:
      "The purchase claims one entry from that listing's pool and hands it to this buyer. If the pool is empty the claim logs and returns silently — the order still completes, so an order confirmation is NOT evidence that anything was delivered.",
    expectedUiState:
      "A real code is shown in a monospace box with a Copy button. Not an error, and not 'No code found for this order'.",
    expectedData: { codeRevealed: true },
    endResult:
      "Reloading /user/digital-codes and revealing again shows the SAME code — it was claimed for this order, not generated on demand.",
  },

  "checklist-selling-digital-content-delivery-available-count-drops-after-purchase": {
    roles: ["buyer", "seller"],
    startPage: "/digital-codes",
    steps: [
      "Open a digital-code listing's public page and write down the codes-available number it shows.",
      "Sign in as the bot buyer claude-tester@letitrip.in / TempPass123! and buy that listing.",
      "Reload the listing's public page and read the number again.",
    ],
    expectedBehaviour:
      "The counter is derived from the pool, so a claim reduces it. A counter a human typed into the seller form and that nothing recomputes will sit at its original value forever — which lets a sold-out listing keep advertising stock, because the availability predicate reads exactly that field.",
    expectedUiState: "The number shown is one lower than before the purchase.",
    expectedData: { availableDelta: -1 },
    endResult: "The lower number survives a reload.",
  },

  "checklist-selling-digital-content-delivery-claimed-entry-cannot-be-removed": {
    roles: ["seller"],
    startPage: "/store/digital-codes",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the Edit action for the listing a code was just bought from.",
      "Find the pool list and locate the row whose status reads claimed.",
      "Look for a Remove button on that row.",
      "Look at a row whose status reads available and compare.",
    ],
    expectedBehaviour:
      "A claimed entry is somebody's purchase. Deleting it makes their reveal answer 404 with no record of what they bought, so the control is absent AND the server refuses it — the UI alone is not the boundary.",
    expectedUiState:
      "The claimed row has no Remove button. The available row does.",
    expectedData: { removeOnClaimedRow: false },
    endResult: "The claimed entry is still present after a reload.",
  },

  "checklist-selling-digital-content-delivery-asset-download-requires-ownership": {
    roles: ["guest", "buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as the bot buyer and open an order for a digital listing that delivered an image or a file.",
      "Press Reveal, then press Download, and confirm the file arrives.",
      "Copy the download URL from the address bar or the network panel.",
      "Open a private window with no session and paste that URL.",
      "Read what comes back.",
      "Sign in as a DIFFERENT buyer in that window and load the same URL again.",
    ],
    expectedBehaviour:
      "The bytes live outside the public media path and are served only by an authenticated route that re-checks order ownership on every hit. A URL that works while signed out means the asset is reachable by anyone who learns the path — and product media filenames here are content-derived and therefore guessable.",
    expectedUiState:
      "The buyer gets the file. The signed-out window and the other buyer both get a not-found page, not the file and not a sign-in redirect that then serves it.",
    expectedData: { guestGetsFile: false, otherBuyerGetsFile: false },
    endResult:
      "Nothing about the order changes. The buyer can still download it afterwards.",
  },

  "checklist-selling-digital-content-delivery-seller-cannot-upload-non-image": {
    roles: ["seller", "admin"],
    startPage: "/store/digital-codes",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and open a digital-code listing's Edit action.",
      "In the pool section, press the upload button and read its label.",
      "Choose a PNG image and confirm it is accepted.",
      "Try to choose a PDF and note whether the picker even offers it.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open the same listing's Edit action and read the upload button's label.",
      "Try a PDF as admin.",
    ],
    expectedBehaviour:
      "A seller may attach the QR image they were given; any other file type is staff-only, because those bytes are later streamed to a buyer and a mislabelled document served inline is stored XSS. The rule is enforced on the server at BOTH the sign and the finalize step — hiding the button is convenience, not the boundary.",
    expectedUiState:
      "As seller the button reads 'Upload QR image' and the picker is restricted to images. As admin it reads 'Upload QR or file' and a PDF is accepted.",
    expectedData: { sellerPdfAccepted: false, adminPdfAccepted: true },
    endResult: "Whatever was accepted is present in the pool after a reload.",
  },

  "checklist-selling-digital-content-delivery-pool-list-never-shows-the-code": {
    roles: ["seller"],
    startPage: "/store/digital-codes",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a digital-code listing's Edit action and find the pool list.",
      "Read every column of a row whose status is available.",
      "Open the browser network panel, reload, and read the response body of the request that fetched the pool.",
    ],
    expectedBehaviour:
      "The pool view answers 'how many are left', not 'what are they'. The response is an allow-list, so the code and the asset path are absent from the payload rather than merely unrendered — a field that reaches the browser has been disclosed whether or not a component draws it.",
    expectedUiState:
      "Each row shows a kind (Code / QR / File), a status, and a filename for assets. No row shows a redemption code.",
    expectedData: { codeInResponseBody: false },
    endResult: "Nothing is changed; this case only reads.",
  },
};
