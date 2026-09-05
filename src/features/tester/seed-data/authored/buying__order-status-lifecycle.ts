/*
 * WHY: Authored six-part procedures for the buying/order-status-lifecycle page.
 * WHAT: 14 case(s), keyed by full checklist id.
 *
 * 🛑 THERE ARE NINE ORDER STATUSES AND THEY BELONG TO EXACTLY TWO SCOPES.
 * Active / Closed / All is a tab bar over one field, and the mapping is total —
 * a status in neither scope produces an order the buyer cannot find in any tab
 * while it still exists and still charges them.
 *
 * `return_requested` is deliberately ACTIVE. It is the next action item, not an
 * ending, and filing it under Closed hides exactly the orders that need attention.
 *
 * Two traps worth knowing before writing here. The scope tab and an explicit
 * status filter are both equalities on the same field, so a scope that does not
 * stand down when a status is chosen produces a query that can never match. And
 * the standard scope is filtered in memory rather than as an equality, because
 * orders written before the field existed carry no value and an equality would
 * silently exclude every one of them.
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
const SIGN_IN_SELLER = "Sign in as tyson@beybladearena.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-buying-order-status-lifecycle-all-statuses-render": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and switch to the All tab.",
      "Read every order's status badge and write down the distinct statuses seen.",
      "Check none reads as a raw stored value such as an underscored word.",
      "Check none is blank.",
      "Switch to dark mode and read the badges again.",
    ],
    expectedBehaviour:
      "Every status has a human label and a badge that is legible in both themes. A status the badge map does not cover falls back to a raw value or to nothing, which is how a real state ends up looking like a data error.",
    expectedUiState:
      "Each order shows a readable status badge in both themes. A raw underscored value, a blank badge, or white-on-near-white in either theme is a finding, with the status named.",
    endResult: "Read-only.",
  },
  "checklist-buying-order-status-lifecycle-active-closed-all-tabs": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and count the orders in the All tab.",
      "Write down each order's status.",
      "Switch to Active and write down which orders it holds.",
      "Switch to Closed and write down which orders it holds.",
      "Add the Active and Closed counts and compare against All.",
      "Identify any order that appears in neither.",
    ],
    expectedBehaviour:
      "Every status maps to exactly one of the two scopes, so Active plus Closed equals All. The mapping is a total one per status specifically so that adding a tenth status is a compile error rather than an order that quietly belongs to neither tab.",
    expectedUiState:
      "The two counts sum to the All count with no overlap. Any order in neither tab is the finding, named with its status.",
    expectedData: { ordersInNeitherTab: 0 },
    endResult: "Read-only.",
  },
  "checklist-buying-order-status-lifecycle-return-requested-is-active": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and find an order whose status is Return Requested, or request a return on a delivered order to create one.",
      "Switch to the Active tab and look for it.",
      "Switch to the Closed tab and look for it.",
      "Record which tab holds it.",
      "Open the seller's own orders list and check it is treated the same way there.",
    ],
    expectedBehaviour:
      "A return request is Active on both sides — it is the seller's next action item and the buyer's open matter. Filing it under Closed hides the orders that most need attention behind a tab labelled as finished.",
    expectedUiState:
      "The order is under Active for the buyer and for the seller, and absent from Closed. Finding it under Closed is the finding.",
    endResult: "Read-only, unless a return was opened to create the state.",
  },
  "checklist-buying-order-status-lifecycle-status-change-visible-to-buyer": {
    roles: ["buyer", "seller"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders, pick a pending order and note its status.",
      "In a second browser, sign in as tyson@beybladearena.in / TempPass123!.",
      "Open that order in /store/orders and move it to the next status.",
      "In the buyer's browser, reload /user/orders.",
      "Read the order's status.",
      "Open the order's detail and read the timeline.",
    ],
    expectedBehaviour:
      "A seller's status change is what the buyer's order reads, with no separate buyer-side copy to fall behind. The buyer should not have to sign out, clear anything, or wait for a background job for the change to appear.",
    expectedUiState:
      "The buyer's list and detail both show the new status after a reload, and the timeline records the transition.",
    endResult: "The order carries the advanced status.",
  },
  "checklist-buying-order-status-lifecycle-status-timeline-real-dates": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and open a shipped or delivered order.",
      "Read the timeline and note the date beside each step it has reached.",
      "Check each date is plausible relative to the order's own date.",
      "Find a step the order reached that has no recorded date.",
      "Read what is shown in place of a date there.",
      "Check no step shows today's date where the transition clearly happened earlier.",
    ],
    expectedBehaviour:
      "A step with no recorded date shows a dash, never a fabricated one. Neither the current time nor a stand-in field is acceptable: the last-updated stamp means the last write of any kind, and a deadline is not an event — inventing either makes the record assert something that did not happen.",
    expectedUiState:
      "Real dates on the steps that have them and an em-dash where none exists. Today's date on an old transition is the finding.",
    endResult: "Read-only.",
  },
  "checklist-buying-order-status-lifecycle-status-timeline-future-steps": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and open an order that is still early in its lifecycle.",
      "Read the timeline top to bottom.",
      "Check the statuses it has not reached are shown as upcoming rather than omitted.",
      "Check they are visually distinct from the ones it has reached.",
      "Open a delivered order and check its timeline shows no upcoming steps.",
    ],
    expectedBehaviour:
      "The order lifecycle is a known sequence, so the steps ahead can be drawn — which is what tells the buyer what happens next rather than only what has happened. Records with no known sequence get a different timeline that draws only what occurred; an order is not one of them.",
    expectedUiState:
      "Reached steps are dated and distinct; unreached steps appear as upcoming without dates. A delivered order shows no upcoming steps.",
    endResult: "Read-only.",
  },
  "checklist-buying-order-status-lifecycle-cancel-allowed-only-before-shipping": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and open a pending order.",
      "Read whether a cancel control is offered.",
      "Open a shipped order and read whether it is offered there.",
      "Open a delivered order and read the same.",
      "If a cancel control is offered on a shipped order, use it and read what happens.",
    ],
    expectedBehaviour:
      "Cancelling is offered while it is still possible and refused once goods are in transit, with the refusal saying why. Offering the control and refusing on submit is worse than not offering it — the buyer has already decided by then.",
    expectedUiState:
      "Cancel is present on the pending order and absent, or present with a stated reason for its refusal, on the shipped and delivered ones. A control that fails only at submit time is the finding.",
    endResult: "No order is cancelled.",
  },
  "checklist-buying-order-status-lifecycle-cancellation-reason-recorded": {
    roles: ["buyer", "seller"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and cancel a pending order, giving the reason 'QA cancellation reason probe — checklist case.'",
      "Reload and read the reason on the buyer's own order.",
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open that order in /store/orders.",
      "Read the cancellation reason there.",
      "Check it is the text the buyer typed, in full.",
    ],
    inputs: { reason: "QA cancellation reason probe — checklist case." },
    expectedBehaviour:
      "The reason is stored on the order and reaches the seller. Cancellation reason is one of the tracked fields the order timeline records, so it survives on both sides — a reason captured and shown only to the buyer teaches the seller nothing about why their sales cancel.",
    expectedUiState:
      "The exact typed text appears on both the buyer's and the seller's view of the order. A truncation or an absence on the seller's side is the finding.",
    endResult: "One order is cancelled with a recorded reason.",
  },
  "checklist-buying-order-status-lifecycle-refund-appears-in-timeline": {
    roles: ["admin", "buyer"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and issue a PARTIAL refund on a delivered order.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open that order in /user/orders and read the timeline.",
      "Check an entry records the refund with its amount.",
      "Check the entry reads as a refund rather than as an array changing size.",
    ],
    expectedBehaviour:
      "A partial refund changes no tracked status field, so a plain difference between the record before and after would produce nothing at all. It is contributed to the timeline explicitly, with its amount — and reading 'a list of one became a list of two' would be true and useless, which is why differencing the refund list was rejected.",
    expectedUiState:
      "A timeline entry naming the refund and its amount. No entry at all, or an entry describing a list changing size, are both findings.",
    endResult: "One order carries a partial refund.",
  },
  "checklist-buying-order-status-lifecycle-tracking-number-shows-when-set": {
    roles: ["seller", "buyer"],
    startPage: "/store/orders",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/orders and open a processing order.",
      "Set the carrier to 'Delhivery' and the tracking number to 'QA1234567890'.",
      "Save and move the order to shipped.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open that order and read the carrier and tracking number.",
      "Follow the tracking link and read where it lands.",
    ],
    inputs: { carrier: "Delhivery", trackingNumber: "QA1234567890" },
    expectedBehaviour:
      "Both values reach the buyer and the tracking link resolves. A tracking number shown without a working link makes the buyer hunt for the carrier's site themselves, and a link built from the wrong field lands on the carrier's homepage with no order attached.",
    expectedUiState:
      "The buyer's order shows Delhivery and QA1234567890, and the link opens the carrier's tracking page for that number.",
    expectedData: { trackingNumber: "QA1234567890" },
    endResult: "The order is shipped with tracking recorded.",
  },
  "checklist-buying-order-status-lifecycle-order-scope-filter-and-status-filter": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders on the Active tab and count the orders.",
      "Apply an explicit status filter for a status that IS active, such as Shipped.",
      "Read the result.",
      "Apply an explicit status filter for a status that is NOT active, such as Delivered, while still on the Active tab.",
      "Read the result and any explanation shown.",
      "Clear the status filter and check the tab's own result returns.",
    ],
    expectedBehaviour:
      "The scope tab and an explicit status filter are both equalities on the same field, and two equalities on one field can never both match. The tab therefore stands down when an explicit status is chosen — otherwise the second combination returns an empty list forever with nothing to indicate why.",
    expectedUiState:
      "The Shipped filter returns shipped orders. The Delivered filter returns delivered orders rather than nothing, or explains that the tab was overridden. A silent empty list is the finding.",
    endResult: "Read-only.",
  },
  "checklist-buying-order-status-lifecycle-seller-status-controls-match-state": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/orders and open a pending order.",
      "Read every status the controls offer.",
      "Open a shipped order and read the same.",
      "Open a delivered order and read the same.",
      "Open a cancelled order and read the same.",
      "Record any control offering a transition that makes no sense from the current status.",
    ],
    expectedBehaviour:
      "The controls offer only what is reachable from where the order actually is. Offering every status from every state lets a seller move a cancelled order to shipped — and once written, that is a record nobody can explain and no screen refuses to render.",
    expectedUiState:
      "Each order offers only forward-plausible transitions, and a cancelled order offers none or only a documented recovery. An impossible transition on offer is the finding, named with the order's current status.",
    endResult: "Read-only; change nothing.",
  },
  "checklist-buying-order-status-lifecycle-status-history-actor-recorded": {
    roles: ["buyer", "seller", "admin"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_SELLER,
      "Move an order forward one status.",
      "Sign in as admin@letitrip.in / TempPass123! and change something on the same order.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and open that order.",
      "Read the timeline and check each entry names who made the change.",
      "Check the seller's change is attributed to the seller and the admin's to an admin.",
      "Check no entry shows a personal name or email in place of a role.",
    ],
    expectedBehaviour:
      "Each entry records the acting role and an identifier, never a name or an email. History is stored inside the order document, and the encryption pass that protects personal fields does not descend into nested arrays — so a name written there would sit in plain text and never be protected on the way back out.",
    expectedUiState:
      "Every entry attributes its change to buyer, seller, admin or the system. A readable email or personal name in an entry is a finding and a leak rather than a display choice.",
    endResult: "The order carries two recorded changes.",
  },
  "checklist-buying-order-status-lifecycle-orders-list-shows-item-not-id": {
    roles: ["buyer", "seller", "admin"],
    startPage: "/user/orders",
    steps: [
      SIGN_IN_BUYER,
      "Open /user/orders and read the primary line of each row.",
      "Check it names the item rather than only an order identifier.",
      "Check a thumbnail of that item is shown.",
      "Find a multi-item order and read how the extra items are indicated.",
      "Repeat on /store/orders as the seller and on /admin/orders as the admin.",
    ],
    expectedBehaviour:
      "A row names what the order was for. The item title and image are denormalised onto the order specifically so no list needs a second read to show them — a row reading only an identifier is a row builder that never read fields already sitting on the record.",
    expectedUiState:
      "Each row shows the item title and thumbnail, with the identifier de-emphasised, and a multi-item order indicates the remainder. This holds on all three surfaces; any one showing only an identifier is a finding.",
    endResult: "Read-only.",
  },
};
