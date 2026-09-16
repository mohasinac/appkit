/*
 * WHY: Authored six-part procedures for buying/order-detail-actions.
 * WHAT: 7 cases, keyed by full checklist id.
 *
 * 🛑 THE WHOLE POST-PURCHASE MONEY SURFACE. `/user/orders/[id]/` has five
 * subroutes — cancel, return, track, invoice, payment — and before 2026-09-14
 * exactly ONE case in the entire 1,188-case catalogue touched any of them.
 *
 * 🛑 NO SEEDED ORDER BELONGS TO karthik.new@gmail.com. Every seeded order belongs
 * to user-yugi-muto, user-seto-kaiba or user-admin-letitrip. So a case that says
 * "open one of your orders" while signed in as karthik has no order to open, and
 * answers `null` forever. The positive cases below BUY first;
 * the seeded ids belonging to other personas are used only as the ownership
 * negatives — which is the dimension nothing tested at all, and the one where a
 * mistake is an IDOR rather than a cosmetic bug.
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
  "checklist-buying-order-detail-actions-invoice-downloads-for-owner": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, a seeded buyer who owns no seeded orders.",
      "Open /products, add any in-stock item to the cart, and complete checkout.",
      "Open /user/orders and find the order you just placed. Write down its id from the row.",
      "Open the order and use its Invoice action.",
      "Read what the browser does with the response.",
    ],
    expectedBehaviour:
      "The invoice is generated on demand and streamed by a route that checks the order belongs to the caller. It is not a stored file and has no public URL.",
    expectedUiState:
      "A file downloads rather than rendering in the tab, and its name contains the order id. Not a JSON blob and not an error page.",
    expectedData: { invoiceDownloaded: true },
    endResult:
      "The order is unchanged by downloading its invoice; the row still shows the same status after a reload.",
  },

  "checklist-buying-order-detail-actions-invoice-refuses-other-buyer": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, a seeded buyer who owns no seeded orders.",
      "Navigate directly to /api/user/orders/order-1-20251107-11joon/invoice — a seeded order belonging to a different persona.",
      "Read the response.",
      "Now navigate to /user/orders/order-1-20251107-11joon.",
      "Read that page.",
    ],
    inputs: { foreignOrderId: "order-1-20251107-11joon" },
    expectedBehaviour:
      "An order id is short and guessable, so ownership is checked on every hit rather than relied upon to be secret. Answering 403 instead of 404 would confirm that an order with that id exists, which is a membership oracle over the id space.",
    expectedUiState:
      "Neither the invoice nor the order page shows any of that order's contents. No item titles, no address, no amounts.",
    expectedData: { foreignInvoiceServed: false },
    endResult: "Nothing about the other buyer's order changes.",
  },

  "checklist-buying-order-detail-actions-cancel-page-refuses-delivered-order": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, a seeded buyer who owns no seeded orders.",
      "Place an order, then open /user/orders and open that order.",
      "Use the Cancel action and read what the page offers.",
      "Complete the cancellation.",
      "Reload the order and read its status.",
      "Use the Cancel action again on the now-cancelled order.",
    ],
    expectedBehaviour:
      "Cancellation is only offered while it is actually possible, and a second attempt on an already-cancelled order is refused with a reason rather than silently accepted. An endpoint that accepts a second cancel writes a second set of side effects — stock restored twice is the usual shape.",
    expectedUiState:
      "The first attempt offers a confirmation and a reason field. After cancelling, the status reads Cancelled and the Cancel action is gone or disabled, with an explanation.",
    expectedData: { statusAfterCancel: "cancelled" },
    endResult:
      "The order stays Cancelled after a reload, and the item's stock is back on its product page.",
  },

  "checklist-buying-order-detail-actions-return-request-round-trip": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! — this persona owns the seeded DELIVERED orders, and a return can only be requested on one.",
      "Open /user/orders and open order-1-20251107-11joon, which is delivered.",
      "Use the Return action.",
      "Give the reason: item not as described.",
      "Submit the request.",
      "Reload the order.",
      "Open /user/returns and look for it.",
    ],
    inputs: { orderId: "order-1-20251107-11joon", reason: "item not as described" },
    expectedBehaviour:
      "A return request moves the order into Return Requested and appears on the returns surface. That status is deliberately an ACTIVE one — it is the seller's next action item, not a closed state — so the order must not disappear from the active list.",
    expectedUiState:
      "The order's status reads Return Requested, and the same order is listed under /user/returns.",
    expectedData: { statusAfterReturn: "return_requested" },
    endResult:
      "After a reload the status and the returns listing both still show it. The reason text is retained.",
  },

  "checklist-buying-order-detail-actions-track-shows-real-dates": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! — this persona owns the seeded SHIPPED order.",
      "Open /user/orders and open order-1-20251104-aevnlw.",
      "Use the Track action.",
      "Read every step on the timeline and note which carry a date and which do not.",
      "Compare the dates shown against the order's own placed and shipped dates.",
    ],
    inputs: { orderId: "order-1-20251104-aevnlw" },
    expectedBehaviour:
      "Each timeline step shows the date actually recorded for it. A step with no recorded date renders an em-dash rather than a guess — an invented or estimated date is worse than a blank, because it cannot be told apart from a real one.",
    expectedUiState:
      "The placed and shipped steps carry dates matching the order. Steps the order has not reached show no date rather than today's.",
    expectedData: { fabricatedDatesShown: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-buying-order-detail-actions-order-subroutes-404-for-other-users-order": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, a seeded buyer who owns no seeded orders.",
      "Navigate to /user/orders/order-1-20251107-11joon/track.",
      "Navigate to /user/orders/order-1-20251107-11joon/invoice.",
      "Navigate to /user/orders/order-1-20251107-11joon/return.",
      "Navigate to /user/orders/order-1-20251107-11joon/cancel.",
      "Navigate to /user/orders/order-1-20251107-11joon/payment.",
      "Read each page in turn.",
    ],
    inputs: { foreignOrderId: "order-1-20251107-11joon" },
    expectedBehaviour:
      "Ownership is enforced on EVERY subroute, not only on the order page that links to them. A subroute that checks nothing is reachable by typing a URL, and these five carry the address, the amounts and the payment details.",
    expectedUiState:
      "All five show a not-found page. None shows an item title, an address, an amount or a tracking number belonging to that order.",
    expectedData: { subroutesLeakingData: 0 },
    endResult: "Nothing about the other buyer's order changes.",
  },

  "checklist-buying-order-detail-actions-order-subroutes-redirect-guest": {
    roles: ["guest"],
    startPage: "/user/orders",
    steps: [
      "Open a private window with no session.",
      "Navigate to /user/orders/order-1-20251107-11joon/track.",
      "Read the page.",
      "Navigate to /user/orders and read that page too.",
    ],
    inputs: { foreignOrderId: "order-1-20251107-11joon" },
    expectedBehaviour:
      "A signed-out visitor is sent to sign in. Being blocked IS the expected result here — the failure to look for is the page rendering its content for a moment before redirecting, which is enough to read and enough for a crawler to capture.",
    expectedUiState:
      "The sign-in page, or the orders page in its signed-out state. At no point does any order content appear, not even briefly.",
    expectedData: { orderContentVisibleToGuest: false },
    endResult: "No session is created and nothing is changed.",
  },
};
