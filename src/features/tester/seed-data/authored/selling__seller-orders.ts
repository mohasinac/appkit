/*
 * WHY: Authored six-part procedures for the selling/seller-orders page.
 * WHAT: 11 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE SELLER SEES LESS OF A MANUAL PAYMENT THAN THE ADMIN DOES, on purpose. The
 * proof screenshot is a bank or UPI capture and stays admin-only; the seller gets
 * a status badge and the reference. Three cases here check the seller CANNOT do
 * what only an admin may — verify, request a re-upload, or reject as fraud.
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
  "checklist-selling-seller-orders-view-orders": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/orders and read every row's primary label.",
      "Check each names the ITEM and shows its thumbnail rather than only an order id.",
      "Read the availability or scope tabs offered and select each in turn.",
      "Read every status filter and select each, noting any that returns nothing.",
      "Open one order and read its detail.",
    ],
    expectedBehaviour:
      "Every order carries its item title and image denormalised onto the document precisely so a list row needs no extra fetch. A row reading 'Order {id}' is a row-mapper that threw that away, leaving the seller to open each order to find out what it is.",
    expectedUiState:
      "Rows name the product with a thumbnail, and a multi-item order shows a '+N more' style suffix rather than only the first item. The order id is present but de-emphasised. Scope tabs read Active / Closed / All. Every status filter returns rows or is genuinely empty.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-orders-seller-order-manual-payment-badge": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/orders and find an order paid by cash or UPI.",
      "Read its manual-payment badge in the list and note the state it reports.",
      "Open the order and read the badge and the payment reference there.",
      "Look for the buyer's uploaded proof screenshot anywhere on the page.",
      "Look for any control to verify, request a re-upload, or reject the payment.",
    ],
    expectedBehaviour:
      "The state is DERIVED from two fields rather than stored, so every surface computes the same four states — awaiting payment, awaiting verification, re-upload requested, resolved. A stored mirror would drift the first time a write path forgot it.",
    expectedUiState:
      "The badge states which of the four the order is in, in both the list and the detail. The reference is shown. The proof SCREENSHOT is not — it is a bank or UPI capture and is admin-only. No verify, re-upload or reject control is offered to the seller.",
    expectedData: { proofScreenshotVisibleToSeller: false },
    endResult:
      "Read-only. A visible screenshot or an actionable verify control here is a permissions finding, not a UI one.",
  },
  "checklist-selling-seller-orders-confirm-payment": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/orders and open an order awaiting payment verification.",
      "Read every control the page offers.",
      "Look specifically for a control that would mark the payment verified.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open the same order in /admin/orders and read the controls offered there.",
    ],
    expectedBehaviour:
      "Verifying a manual payment is an admin and moderator action. The seller is the beneficiary of the payment, so letting them confirm it is the party with the incentive marking their own money received — the split is deliberate and the admin view is where the control lives.",
    expectedUiState:
      "The seller's view offers no verify control. The admin's view offers Verify alongside Request re-upload and Reject as fraud, with the proof screenshot visible. A verify control on the seller's page is the failure.",
    endResult:
      "Do not verify anything. Read-only on both sides.",
  },
  "checklist-selling-seller-orders-request-reupload": {
    roles: ["seller", "admin"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and open an order whose proof has been submitted.",
      "Confirm no re-upload control is offered to the seller.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open the same order in /admin/orders and use Request re-upload, typing a note.",
      "Sign in as the buyer who placed that order and open the order's payment page.",
      "Read whether the upload form is active again and what the deadline shows.",
    ],
    expectedBehaviour:
      "Only an admin may request a re-upload, and doing so reopens the buyer's window. The note is required — a re-upload request with no reason leaves the buyer resubmitting the same thing.",
    expectedUiState:
      "The seller has no such control. The admin's request requires a note before it will submit. The buyer's payment page becomes active again with an extended deadline rather than staying locked.",
    endResult:
      "The order is left in the re-upload-requested state. Note that a corrected re-upload must clear that state — an order stuck in it is invisible to both the auto-approve sweep and the admin queue, and stalls forever.",
  },
  "checklist-selling-seller-orders-reject-fraud": {
    roles: ["seller", "admin"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and open an order awaiting verification.",
      "Confirm no reject-as-fraud control is offered.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open the same order in /admin/orders and read the reject-as-fraud control and what it requires.",
      "Read any confirmation dialog it opens, without confirming it.",
      "Cancel out of the dialog.",
    ],
    expectedBehaviour:
      "Rejecting as fraud is admin-only and requires a note, because it cancels the order, restores stock and enqueues a seven-day ban cascade against the buyer. A destructive action of that reach must carry a confirmation naming what it will do — one without it executes immediately with no warning.",
    expectedUiState:
      "The seller has no such control. The admin's version requires a note and opens a confirmation that names the consequences rather than asking a generic 'Are you sure?'. Cancelling leaves the order untouched.",
    endResult:
      "Nothing is rejected. Cancel rather than confirm — this action bans a real account for seven days.",
  },
  "checklist-selling-seller-orders-mark-shipped": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/orders and open an order that is ready to ship.",
      "Use the mark-shipped control and read what it asks for.",
      "Type 'QA Carrier mark-shipped' as the carrier and 'QATRACK118427' as the tracking number, then submit.",
      "RELOAD the order and read its status, carrier and tracking number.",
      "Open /store/orders and check the row's status has moved too.",
      "Check the scope tabs — the order should still be under Active, not Closed.",
    ],
    inputs: { carrier: "QA Carrier mark-shipped", trackingNumber: "QATRACK118427" },
    expectedBehaviour:
      "Marking shipped records the carrier and tracking number alongside the status. Shipping is manual here — there is no carrier integration — so the seller's typed values ARE the tracking data, and a status change that discards them leaves the buyer with nothing to follow.",
    expectedUiState:
      "After the reload the order reads as shipped and holds both the carrier and the tracking number. The list row reflects the new status. The order stays in the Active scope, since shipped is not a closed state.",
    expectedData: { trackingNumber: "QATRACK118427" },
    endResult:
      "The order is shipped and carries its tracking data. A status that moved while the carrier and tracking are blank is the failure.",
  },
  "checklist-selling-seller-orders-tracking-visible": {
    roles: ["seller", "buyer"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and open the order marked shipped in the previous case.",
      "Read the carrier and tracking number shown.",
      "Sign out and sign in as the buyer who placed that order.",
      "Open /user/orders and open the same order.",
      "Read the carrier and tracking number there.",
      "Open the order's tracking page and read what it shows.",
    ],
    inputs: { trackingNumber: "QATRACK118427" },
    expectedBehaviour:
      "What the seller entered reaches the buyer. The buyer's tracking page renders a timeline from the order's real per-status dates — a status with no recorded date shows no timestamp rather than a guessed one, because a fabricated date is worse than a missing one.",
    expectedUiState:
      "Both sides show the same carrier and tracking number. The buyer's tracking page renders a timeline with real dates against the statuses that have them, and an em-dash against those that do not.",
    endResult:
      "Read-only on the buyer side. A tracking page that is blank, or that shows invented dates for every status, are both failures.",
  },
  "checklist-selling-seller-orders-whatsapp-admin-share": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/orders and open an order.",
      "Find the WhatsApp share control and read what it offers.",
      "Trigger it and read the message it composes before sending anything.",
      "Check the message for the buyer's full phone number, full address and any payment identifier.",
      "Close without sending.",
    ],
    expectedBehaviour:
      "The share composes a message about the order. What it must not do is put more of the buyer's data into a third-party app than the seller needs to fulfil — a share that pastes a full address and phone into an outbound message has moved PII somewhere no policy here covers.",
    expectedUiState:
      "The composed message identifies the order and what it contains. Read exactly what buyer data it includes and record it. A full payment identifier in the message is a finding regardless of anything else.",
    endResult:
      "Nothing is sent. Report precisely which buyer fields the message carries — that is the substance of this case.",
  },
  "checklist-selling-seller-orders-seller-auction-forfeit-notification": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and open the notification list.",
      "Look for any notification about an auction win that lapsed unpaid.",
      "Read its title, body and destination if one exists.",
      "Open the store's auctions list and find an auction whose win was forfeited.",
      "Read what state that auction is now in.",
    ],
    expectedBehaviour:
      "When a win lapses unpaid the bid is forfeited and the buyer is notified. Whether the SELLER is notified is the question this case answers rather than assumes — for an unpaid buyout the seller is deliberately not told, because nothing was ever sold, and the same reasoning may or may not apply here.",
    expectedUiState:
      "Record what the seller actually receives. If a notification exists it has a readable title, a body and a destination that resolves. If none exists, record that as the observed behaviour rather than as a failure.",
    endResult:
      "Read-only. This case documents behaviour; report what happened rather than forcing a yes or no.",
  },
  "checklist-selling-seller-orders-seller-order-detail-full-page": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/orders and open an order's detail panel from the list.",
      "Write down every field label and section it shows.",
      "Note the order id and close the panel.",
      "Open that order's standalone detail page directly by URL.",
      "Write down every field and section, and compare the two lists.",
      "Reload the standalone page and confirm it still loads the same order.",
    ],
    expectedBehaviour:
      "The panel and the page render from one shared content component, so their fields match by construction. The standalone page exists because a panel cannot be bookmarked or sent to someone — and an order is exactly the record a seller needs to share.",
    expectedUiState:
      "Both surfaces show the same fields and sections with the same values. The standalone page survives a reload on the same order. A field in one and not the other means a second copy of the content component has appeared and the two will drift.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-seller-orders-seller-new-order-notification-reaches-seller": {
    roles: ["buyer", "seller"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-valkyrie (₹999, Beyblade Arena) to the cart.",
      "Open /checkout, select the first saved address, choose Cash on Delivery, and place the order.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!, who owns that store.",
      "Open /store and read the notification bell.",
      "Open the notification list, read the newest entry's title and body, and click it.",
      "Read where it lands.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie", paymentMethod: "Cash on Delivery" },
    expectedBehaviour:
      "A new order notifies the store that received it. The audience is a property of the EVENT, not of the person — the same account is a buyer elsewhere, so the notification has to be addressed to the store portal rather than to whichever dashboard the user happens to open.",
    expectedUiState:
      "The bell shows an unread count and the newest entry names the new order with a readable body. Clicking it opens that order in the STORE portal, not the buyer's own order page.",
    endResult:
      "The order exists and the notification survives a reload. No notification at all means the hook did not fire; one landing in the buyer portal means the audience was resolved from the person rather than the event.",
  },
};
