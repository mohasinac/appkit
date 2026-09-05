/*
 * WHY: Authored six-part procedures for the admin/orders-fulfillment page.
 * WHAT: 20 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE MANUAL-PAYMENT STATE IS DERIVED, NEVER STORED — four states computed from
 * two fields, so every surface agrees by construction. That is also why the admin
 * queue is not an ordinary filter: "has a proof" is not a Firestore-filterable
 * predicate, since an inequality excludes every document where the field was never
 * written, which is exactly the awaiting-payment set. The queue therefore reads a
 * bounded window and refines in memory.
 *
 * The payment actions here are the most consequential in the admin panel: rejecting
 * as fraud cancels the order, restores stock and bans a real account for seven days.
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
  "checklist-admin-orders-fulfillment-orders-status-change": {
    roles: ["admin", "buyer"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and open an order in a pending state.",
      "Read every status the status control offers.",
      "Compare that list against the nine order statuses the system has.",
      "Change the status one step forward and save.",
      "RELOAD and read the status and the order's own history entries.",
      "Sign in as the buyer who placed it and read the status on their order page.",
    ],
    expectedBehaviour:
      "A status change is written with a history entry recording who changed it, when, and from what — appended inside the repository's write primitives rather than at each call site, so all thirty-odd write paths record it. The buyer sees the same status; a change visible only in the admin means the write did not reach the order.",
    expectedUiState:
      "The status control offers the real statuses. After the reload the new status holds and a history entry names the transition with an actor and a timestamp. The buyer's view shows the same status.",
    endResult:
      "The order carries its new status. A history entry with a fabricated timestamp — one invented for a status with no recorded date — is a separate finding.",
  },
  "checklist-admin-orders-fulfillment-admin-emi-order-reviewable": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and find an order paid by EMI.",
      "Open it and read the instalment schedule.",
      "Check the number of instalments, each amount and each due date are shown.",
      "Read whether the seller's share of any surcharge is displayed.",
      "Read the payment actions offered for this order.",
    ],
    expectedBehaviour:
      "An EMI order is reviewable with its full schedule. The surcharge has a platform-versus-seller split that is server-side only — the buyer is quoted from a projection that excludes it. Whether an admin may see it is a judgement, but it must never have reached the buyer's quote.",
    expectedUiState:
      "The schedule shows every instalment with its amount and due date. Record whether the seller share is displayed here. An EMI order with no schedule at all is the failure.",
    endResult: "Read-only; take no payment action.",
  },
  "checklist-admin-orders-fulfillment-admin-decided-order-no-live-buttons": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and find an order whose payment has already been verified.",
      "Open it and read every payment control offered.",
      "Check whether Verify, Request re-upload and Reject as fraud are still active.",
      "Find an order already rejected as fraud and read its controls.",
      "Find a cancelled order and read its controls.",
    ],
    expectedBehaviour:
      "Once a payment decision is made, the decision controls are gone rather than merely discouraged. An active Reject-as-fraud button on an already-verified order is one click from cancelling a paid order and banning its buyer for seven days.",
    expectedUiState:
      "Decided orders show their outcome and no live payment-decision controls. Buttons that are present but disabled are acceptable; buttons that still act are the failure.",
    expectedData: { liveDecisionControlsOnDecidedOrder: 0 },
    endResult: "Read-only; click nothing.",
  },
  "checklist-admin-orders-fulfillment-admin-orders-payment-review-filters": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and find the manual-payment filter chips.",
      "Read every chip offered and write the list down.",
      "Select each in turn and read the rows returned.",
      "Check the awaiting-payment chip returns orders with NO proof uploaded.",
      "Check the awaiting-verification chip returns orders WITH a proof and no decision.",
      "Read the URL and confirm the selection is encoded there.",
    ],
    expectedBehaviour:
      "The queue is not an ordinary Sieve filter. 'Has a proof' cannot be expressed as a query predicate — an inequality on the proof field excludes every document where it was never written, which IS the awaiting-payment set, so the query would return only the opposite of what was asked. The queue runs one bounded query and refines in memory instead, reached through its own query parameter.",
    expectedUiState:
      "The awaiting-payment chip returns orders with no proof, and the awaiting-verification chip returns orders with a proof and no decision — two visibly different sets. A chip returning the inverse of its name is the predicate failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-orders-fulfillment-admin-orders-payment-state-on-row": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and read the secondary line on every manual-payment row.",
      "Check each states which of the four payment states the order is in.",
      "Open one of those orders and compare the state shown there against the row.",
      "Find an order in the re-upload-requested state and read how the row describes it.",
      "Find a rejected order and read its row.",
    ],
    expectedBehaviour:
      "The state is derived from two fields on every surface, so the row and the detail cannot disagree. A stored mirror would drift the first time a write path forgot it, which is why there is no such field.",
    expectedUiState:
      "Every manual-payment row names its state and matches the order's own detail. All four states are distinguishable from the row alone, including re-upload-requested — an order stuck in that state is invisible to both the auto-approve sweep and the queue, so it has to be visible here.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-orders-fulfillment-admin-orders-view-payment-proof": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and open an order awaiting payment verification.",
      "Find the buyer's uploaded proof and open it at full size.",
      "Read the payment reference the buyer entered.",
      "Read the expected payment identifier the order was created with.",
      "Compare the two and check the page flags any mismatch.",
    ],
    expectedBehaviour:
      "The admin sees the screenshot, the reference the buyer typed, and the identifier the order expected — and the page compares them. A mismatch warning is the whole point of showing both: an admin reading two long strings side by side will miss a single transposed digit.",
    expectedUiState:
      "The screenshot opens legibly at full size. Both identifiers are shown together and a mismatch is flagged rather than left for the admin to spot. A verify control with no proof visible is the acting-blind failure.",
    endResult: "Read-only; take no decision.",
  },
  "checklist-admin-orders-fulfillment-admin-orders-verify-payment": {
    roles: ["admin", "buyer"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and open an order awaiting verification, noting its buyer and total.",
      "Read the proof and the references, then use Verify.",
      "Read the confirmation and RELOAD the order.",
      "Read the payment status, the order status and the history entries.",
      "Sign in as that buyer and read the order's status and payment state on their side.",
      "Check the payment upload page for that order is no longer active.",
    ],
    expectedBehaviour:
      "Verifying marks the payment paid, moves the order forward and records a history entry. The buyer's own view has to agree — a verification visible only to the admin leaves the buyer believing they still owe money.",
    expectedUiState:
      "After the reload the payment reads as paid with a history entry naming the admin and the time. The buyer's order shows the same, and their upload page is closed rather than still inviting a proof.",
    endResult:
      "One order is verified. Choose an order created by an earlier case rather than a real one.",
  },
  "checklist-admin-orders-fulfillment-admin-orders-request-reupload": {
    roles: ["admin", "buyer"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open an order awaiting verification and use Request re-upload.",
      "Attempt to submit with an empty note and read what happens.",
      "Type 'QA Note request-reupload — the screenshot is unreadable.' and submit.",
      "RELOAD and read the order's payment state.",
      "Sign in as the buyer, open the order's payment page, and read whether the form is active and what the deadline shows.",
      "Upload a new proof as the buyer and submit it.",
      "Sign back in as admin, RELOAD the order, and read its payment state.",
    ],
    inputs: { note: "QA Note request-reupload — the screenshot is unreadable." },
    expectedBehaviour:
      "The note is required — a re-upload request with no reason leaves the buyer resubmitting the same thing. The corrected upload must CLEAR the requested state: an order left in it is invisible to both the two-hour auto-approve sweep and the admin queue, and stalls indefinitely with nobody looking at it.",
    expectedUiState:
      "The empty note is refused. After the request the buyer's upload form is active again with an extended deadline. After their re-upload the admin order returns to awaiting-verification rather than staying in the requested state.",
    expectedData: { stateAfterReupload: "awaiting verification" },
    endResult:
      "The order is back in the queue. An order still reading re-upload-requested after a fresh proof is the stall this case exists for.",
  },
  "checklist-admin-orders-fulfillment-admin-orders-reject-fraud": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open an order awaiting verification and locate Reject as fraud.",
      "Attempt to submit with an empty note and read what happens.",
      "Type a note and read the confirmation dialog that opens.",
      "Read whether it names what will happen — the cancellation, the stock restore and the ban.",
      "CANCEL the dialog rather than confirming.",
      "RELOAD and confirm the order is unchanged.",
    ],
    expectedBehaviour:
      "Rejecting as fraud cancels the order, restores stock and enqueues a seven-day ban cascade against the buyer. A destructive action of that reach must carry a confirmation naming the consequences — one without it executes immediately with no warning, and this is not an action to discover by clicking.",
    expectedUiState:
      "The empty note is refused. The confirmation names the cancellation, the stock restore and the ban rather than asking a generic 'Are you sure?'. Cancelling leaves the order untouched after a reload.",
    endResult:
      "Nothing is rejected. CANCEL rather than confirm — this action bans a real account for seven days.",
  },
  "checklist-admin-orders-fulfillment-admin-orders-payment-actions-hidden-when-paid": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open an order paid by an online gateway rather than manually.",
      "Read whether any manual-payment controls are offered.",
      "Open a cash or UPI order that has already been verified and read its controls.",
      "Open an order still awaiting payment and read its controls.",
      "Compare all three.",
    ],
    expectedBehaviour:
      "Manual-payment controls appear only where a manual payment is pending. A gateway-paid order never had a proof to review, and a verified one has been decided — offering the controls on either invites an action with no meaning and real consequences.",
    expectedUiState:
      "The gateway order shows no manual-payment controls at all. The verified one shows its outcome without live decision buttons. Only the pending order offers them. Identical controls on all three is the failure.",
    endResult: "Read-only; click nothing.",
  },
  "checklist-admin-orders-fulfillment-bids-admin-view": {
    roles: ["admin"],
    startPage: "/admin/bids",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bids and read every column.",
      "Read every status filter offered and select each, noting any that returns nothing.",
      "For each empty filter, check the unfiltered list for rows of that status.",
      "Open a row and read the bid's detail.",
      "Check the row action menu offers a view rather than only mutations.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Bids are readable before being acted on. Their statuses include outbid, won, forfeited and cancelled — a chip naming a value bids never hold matches nothing forever, and a bid list where rows cannot be opened is a dead end.",
    expectedUiState:
      "Every status filter returns its own rows or is empty with none unfiltered either. A row opens to a detail. 'zzzznope' returns none.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-orders-fulfillment-return-requests-triage": {
    roles: ["admin", "buyer"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin returns surface and read the rows.",
      "Check each row shows the item, the buyer's stated reason and the order it belongs to.",
      "Read the scope tabs and check which scope a return-requested order sits under.",
      "Open one and read the full reason before acting.",
      "Approve or reject it with a note, then RELOAD and read the order's status and history.",
      "Sign in as the buyer and read the order's status on their side.",
    ],
    expectedBehaviour:
      "A return is an order STATUS rather than a separate entity, so returns are a view over orders and the request is the seller's next action item — which is why return-requested belongs under the Active scope rather than Closed. The buyer's stated reason has to be readable before a decision, not after.",
    expectedUiState:
      "Rows show the item, the reason and the order. Return-requested orders appear under Active. The decision is recorded with a history entry and the buyer's view agrees.",
    endResult:
      "One return is triaged. A return-requested order filed under Closed is the finding, since it disappears from the queue the seller works from.",
  },
  "checklist-admin-orders-fulfillment-fulfillment-queue-admin": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin fulfillment queue and read every row's primary label.",
      "Check each names the ITEM and shows its thumbnail rather than only an order id.",
      "Read a multi-item order's row and check it indicates there is more than one item.",
      "Read the queue's ordering and check the oldest unfulfilled order is first.",
      "Use every filter offered and confirm each changes the rows.",
    ],
    expectedBehaviour:
      "Every order carries its item title and image denormalised onto the document so a list row needs no extra fetch. A row reading 'Order {id}' threw that away and forces the admin to open each order to learn what it is — the data was there the whole time.",
    expectedUiState:
      "Rows name the product with a thumbnail and a multi-item order shows a '+N more' style suffix. The order id is present but de-emphasised. The oldest unfulfilled order is first.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-orders-fulfillment-shipments-crud": {
    roles: ["admin"],
    startPage: "/admin/shipments",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin shipments surface and read the existing shipments.",
      "Create one named 'QA Shipment admin-crud' with a supplier and a date, and save.",
      "RELOAD and read every field.",
      "Add a lot and an item to it, save, RELOAD, and read them back.",
      "Edit ONLY the supplier, save, RELOAD, and check the lots and items are unchanged.",
      "Read any money figure and check it reads as rupees rather than a hundredfold value.",
      "Delete the shipment.",
    ],
    inputs: { name: "QA Shipment admin-crud" },
    expectedBehaviour:
      "A shipment carries lots and items as FK-linked children, and an edit to the parent leaves them alone. Money here is decimal rupees like everywhere else — a seed file once carried hundredfold literals in this feature and inflated every profit projection by a hundred, which is visible only by reading a figure and asking whether it is plausible.",
    expectedUiState:
      "After each reload the shipment holds its fields and its children. The supplier edit leaves the lots and items intact. Money figures are plausible rupee amounts, not values a hundred times too large.",
    endResult: "The shipment is deleted by the final step.",
  },
  "checklist-admin-orders-fulfillment-print-center-admin": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin print centre and read what it offers.",
      "Select two orders or items to print.",
      "Read the URL and check the selection is encoded there.",
      "Read the preview and check it carries the right store's name, logo and address for each order.",
      "Open the URL in a new tab and check the same selection arrives.",
      "Check any barcode shown matches the product it is printed for.",
    ],
    expectedBehaviour:
      "The selection is deep-linkable and the preview carries real context. Where orders from different stores are printed together, each label must carry ITS OWN store's details — a print run that stamps one store's address on another's parcel is a delivery failure rather than a formatting one.",
    expectedUiState:
      "The URL encodes the selection and the pasted URL reproduces it. Each label carries the correct store's name, logo and address. Barcodes match their products.",
    endResult: "Nothing is sent to a physical printer.",
  },
  "checklist-admin-orders-fulfillment-payouts-export-admin": {
    roles: ["admin"],
    startPage: "/admin/payouts",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/payouts and read the rows, their statuses and their amounts.",
      "Note the total number of payouts.",
      "Trigger the export and read what the page does immediately.",
      "Navigate away and back and check progress is still reported.",
      "Open the finished file and compare its row count against the list.",
      "Read whether payout bank identifiers appear in the file and in the list.",
    ],
    expectedBehaviour:
      "The export runs as a background job rather than inside the request. Payout details are PII-encrypted at rest — the file legitimately needs identifiers to be actionable, the LIST does not, and where each is masked is worth recording separately.",
    expectedUiState:
      "The export returns immediately with a job accepted and its progress survives navigation. The file's row count matches the list. Record how identifiers appear in each.",
    endResult:
      "An export file exists. A request that hangs and then times out is the failure.",
  },
  "checklist-admin-orders-fulfillment-bulk-action-realtime-progress": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and tick several rows.",
      "Read the bulk action bar and the count it states against the number ticked.",
      "Choose a non-destructive bulk action and start it.",
      "Read what the page does immediately — whether it blocks or returns.",
      "Watch the progress indicator and read the completion summary.",
      "Navigate away and back mid-run, then read whether progress is still reported.",
      "Clear the selection and check the bar disappears.",
    ],
    expectedBehaviour:
      "A bulk action of unknown size is enqueued as a job and its progress streamed, rather than run inside the request where the function ceiling kills it. A bounded action over a small selection may legitimately run synchronously — what must not happen is a large run that hangs and times out with no summary.",
    expectedUiState:
      "The bar's count matches the ticked rows. The action reports progress and finishes with a summary naming how many succeeded and failed. Progress survives navigating away. Clearing the selection hides the bar without leaving an empty strip.",
    endResult:
      "The chosen action's effects persist. Pick a reversible action and undo it afterwards.",
  },
  "checklist-admin-orders-fulfillment-admin-order-list-item-and-detail": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and read every row's primary label.",
      "Check each names the item and shows a thumbnail rather than a bare order id.",
      "Find a multi-item order and read how its row summarises the contents.",
      "Open that row and check every item is listed with its own quantity and price.",
      "Check a bundle or grouped line is collapsed back into one line on the receipt.",
    ],
    expectedBehaviour:
      "Rows read from the denormalised item data already on the order. In the detail, a bundle or grouped line is stored as one row PER MEMBER — per-product tax codes are a GST invoice requirement and cancellations are per product — and the receipt collapses them back into the single line the buyer chose.",
    expectedUiState:
      "Rows name the product with a thumbnail and multi-item orders say so. The detail lists every item. A bundle appears as ONE line on the receipt rather than as its individual members.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-orders-fulfillment-admin-order-detail-standalone-page": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and open an order's detail panel from the list.",
      "Write down every field label and section it shows.",
      "Note the order id and close the panel.",
      "Open that order's standalone detail page directly by URL.",
      "Write down every field and section and compare the two lists.",
      "Reload the standalone page and confirm it loads the same order.",
    ],
    expectedBehaviour:
      "The panel and the page render from one shared content component, so their fields match by construction. The standalone page exists because a panel cannot be bookmarked or sent to a colleague — and an order under dispute is exactly the record that gets shared.",
    expectedUiState:
      "Both show the same fields and sections with the same values, and the standalone page survives a reload. A field in one and not the other means a second copy of the component has appeared and the two will drift.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-orders-fulfillment-admin-payout-detail-view": {
    roles: ["admin"],
    startPage: "/admin/payouts",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/payouts and open a payout's detail.",
      "Read the gross, every deduction line and the net.",
      "Add the deductions and check gross minus them equals the net.",
      "Read the list of orders included.",
      "Read the payout's history entries and check each names an actor and a time.",
      "Read whether the seller's bank identifier is shown in full.",
    ],
    expectedBehaviour:
      "The breakdown reconciles exactly — a net figure alone cannot distinguish a correct deduction from a wrong one, and a payout is money leaving the platform. The status history is written through the repository's batch primitives against a running copy rather than the original snapshot, so a pending-to-processing-to-failed sequence records all three rather than only the last.",
    expectedUiState:
      "Gross minus the listed deductions equals the net to the paisa. The included orders are identifiable. History shows each transition with an actor. Bank identifiers are masked rather than shown in full.",
    expectedData: { deductionsReconcile: true },
    endResult: "Read-only; take no payout action.",
  },
};
