/*
 * WHY: Authored six-part procedures for the buying/my-orders checklist page.
 * WHAT: 14 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE MANUAL-PAYMENT FLOW WAS COMPLETELY DEAD FROM THE BUYER'S SIDE and nothing
 * errored. The order adapter mapped the payment STATUS and no other payment field,
 * so the payment page's own gate — is this a manual payment method — was undefined
 * for every order, and every buyer who reached it was told politely that the order
 * did not require a manual payment. Five cases here exist because of that, and
 * each reads a field that adapter has to carry.
 *
 * 🛑 `orderType` CANNOT BE FILTERED WITH AN EQUALITY ON "standard". Orders written
 * before the field existed carry no value, and a Firestore equality excludes every
 * document missing the field — so the Normal tab must filter in memory or it hides
 * every legacy order.
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
  "checklist-buying-my-orders-orders-item-summary": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and read every row's primary label.",
      "Check each names the ITEM rather than only an order identifier.",
      "Find a multi-item order and read how its row summarises the contents.",
      "Check each row shows a thumbnail of the item.",
      "Read where the order id appears and how prominent it is.",
    ],
    expectedBehaviour:
      "Every order carries its item title and image denormalised onto the document so a list row needs no extra fetch. A row reading 'Order {id}' threw that away — the data was present the whole time, and the buyer is left opening each order to find out what it was.",
    expectedUiState:
      "Rows name the product with a thumbnail, a multi-item order shows a '+N more' style suffix, and the order id is present but de-emphasised rather than being the whole label.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-my-orders-orders-view-details-button": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and click a row's body away from any control.",
      "Read what opens.",
      "Go back and use the explicit view-details control on the same row.",
      "Check both reach the same order.",
      "Read whether the row also offers actions, and whether at least one is a view rather than a mutation.",
    ],
    expectedBehaviour:
      "The row and its view control reach the same order. A row offering only mutations lets a buyer act on an order they were never able to read, which is the dead-end shape this whole listing family exists to close.",
    expectedUiState:
      "Both routes open the same order detail. A view affordance exists alongside any actions. An inert row is the failure.",
    endResult: "Read-only; close without acting.",
  },
  "checklist-buying-my-orders-orders-type-tabs-actually-filter": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and read every tab offered.",
      "Note the unfiltered order count on the All tab.",
      "Open the Auction wins tab and read the count and the rows.",
      "Open the Offer wins tab and read the count and the rows.",
      "Open the Normal tab and read the count and the rows.",
      "Check the three tabs' counts sum to the All count.",
    ],
    expectedBehaviour:
      "Each tab filters by the lane that produced the order — recorded on the order at creation — and together they partition the whole set. A tab returning the full list is not filtering; one returning nothing while orders of that kind exist is filtering on the wrong value.",
    expectedUiState:
      "Auction wins holds only auction-won orders, Offer wins only offer-accepted ones, and the three counts sum to the All count. A sum that does not reconcile means orders are falling through every tab.",
    expectedData: { tabsPartitionAll: true },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-my-orders-orders-normal-tab-includes-legacy": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders on the All tab and note the total count.",
      "Note the count on the Auction wins and Offer wins tabs.",
      "Subtract those two from the total to get the expected Normal count.",
      "Open the Normal tab and read its actual count.",
      "Compare the two numbers.",
      "Look for the OLDEST order in the account and check it appears on the Normal tab.",
    ],
    expectedBehaviour:
      "The Normal tab must filter IN MEMORY rather than with an equality on the standard lane value. Orders written before that field existed carry no value at all, and a Firestore equality excludes every document missing the field — so an equality-filtered Normal tab silently hides every legacy order while looking like it works.",
    expectedUiState:
      "The Normal count equals the total minus the two lane tabs, and the account's oldest order is present. A Normal count lower than that arithmetic is the legacy-exclusion failure, and the missing orders are the oldest ones.",
    expectedData: { normalTabIncludesLegacy: true },
    endResult:
      "Read-only. The arithmetic is the assertion — a Normal tab holding plausible rows proves nothing without it.",
  },
  "checklist-buying-my-orders-dashboard-recent-orders-linked": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user and find the recent-orders area on the dashboard.",
      "Read each entry and check it names the item rather than only an identifier.",
      "Click one entry and read where it lands.",
      "Go back and click the heading or see-all control.",
      "Check it lands on /user/orders rather than nowhere.",
    ],
    expectedBehaviour:
      "Dashboard entries link to their orders and the section links to the full list. A summary section whose rows are inert is a dead end on the page a buyer lands on first.",
    expectedUiState:
      "Each entry names its item and opens that order. The see-all control reaches /user/orders. An entry that does nothing on click is the failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-my-orders-order-item-thumbnails-render": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and look at every row's thumbnail.",
      "Check each shows a photograph rather than an empty box or a placeholder icon.",
      "Hard-reload with Ctrl+Shift+R and look again.",
      "Open an order's detail and look at each item's thumbnail there.",
      "Compare a thumbnail against that product's own page image.",
    ],
    expectedBehaviour:
      "Order items carry an image snapshot so the row renders without fetching the product. That field was absent from the order item type for a long time, so real orders carried no per-item image at all — which renders as a placeholder rather than as an error.",
    expectedUiState:
      "Every row and every order-detail item shows its own photograph on both loads, and it matches the product. An empty box or a uniform placeholder across all rows is the missing-field failure.",
    expectedData: { placeholderThumbnails: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-my-orders-my-orders-search-filter-sort": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and note the unfiltered count.",
      "Read the scope tabs offered and select each, reading the counts.",
      "Read every status filter and select each, noting any that returns nothing.",
      "Search for a word from a visible order's item title and read the results.",
      "Search zzzznope and read the count.",
      "Change the sort and check the row order changes.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Search, filters and sort all narrow the list. The scope tabs read Active / Closed / All, and a return-requested order belongs to ACTIVE — it is an action item, not a finished order. The nonsense query is the control that proves the search filters rather than decorating.",
    expectedUiState:
      "Scope tabs and status filters each change the rows. The real search term narrows; 'zzzznope' returns zero rather than the full list. The sort visibly reorders. A return-requested order appears under Active.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-my-orders-order-tracking-timeline": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open a SHIPPED order.",
      "Open its tracking view.",
      "Read every step in the timeline and the date against each.",
      "Check steps the order has not reached are shown as upcoming rather than complete.",
      "Check any step with no recorded date shows an em-dash rather than a date.",
      "Read the carrier and tracking number and compare them against the order detail.",
    ],
    expectedBehaviour:
      "The timeline is built from the order's own per-status dates. A status with no recorded date renders an em-dash — never the current time and never a proxy field such as the record's last-updated value, which means 'last write of any kind' rather than 'when this happened'. A fabricated date cannot be told from a real one afterwards.",
    expectedUiState:
      "Reached steps show real dates, unreached steps show as upcoming, and any missing date is an em-dash. The carrier and tracking number match the order detail. Every step carrying a plausible date on an order that has only just shipped is the fabrication failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-my-orders-manual-payment-panel-on-order-detail": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open an order paid by cash or UPI awaiting payment.",
      "Read the order detail for a manual-payment panel.",
      "Check it names the payment method, the amount and the deadline.",
      "Find the control that opens the payment page.",
      "Click it and read where it lands.",
    ],
    expectedBehaviour:
      "The panel renders because the order carries its payment method, deadline and review outcome — not just its payment status. The adapter mapped only the status for a long time, so every buyer-facing gate on those fields saw undefined and the whole manual-payment flow was unreachable.",
    expectedUiState:
      "The panel is present on a manual-payment order, naming the method, amount and deadline, with a working control into the payment page. A missing panel on a cash or UPI order is the adapter failure.",
    endResult: "Read-only; upload nothing yet.",
  },
  "checklist-buying-my-orders-manual-payment-page-renders-upi-and-countdown": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open a manual-payment order and follow the control to its payment page.",
      "Read whether the page renders the upload form or tells you no manual payment is required.",
      "Read the UPI identifier displayed and the amount.",
      "Read the countdown and note the time remaining.",
      "Wait ten seconds and read the countdown again.",
      "Reload the page and check the countdown continues rather than resetting.",
    ],
    inputs: { paymentWindowMinutes: 15 },
    expectedBehaviour:
      "The page gates on the order's payment method, so it must render the form rather than the polite refusal that every buyer saw while that field was undefined. The countdown runs against the stored deadline, so a reload continues it rather than restarting the window.",
    expectedUiState:
      "The upload form, the UPI identifier and the amount all render. The countdown decreases over ten seconds and continues from where it was after a reload. A message saying this order does not require manual payment is the exact failure this case exists for.",
    endResult:
      "Read-only. A reset countdown after reload would mean the window restarts on every visit.",
  },
  "checklist-buying-my-orders-manual-payment-awaiting-review-state": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open a manual-payment order's payment page and upload public/test-media/sample-image.png as proof.",
      "Type QATXN552310 as the payment reference and submit.",
      "Read what the page shows immediately afterwards.",
      "RELOAD and read the page again.",
      "Open the order detail and read its payment state.",
      "Check the upload form is no longer inviting another submission.",
    ],
    inputs: { proof: "public/test-media/sample-image.png", reference: "QATXN552310" },
    expectedBehaviour:
      "Once a proof is submitted the order reads as awaiting verification on both the payment page and the order detail — the state is derived from whether a proof exists and whether a decision has been made, so both surfaces compute the same answer.",
    expectedUiState:
      "After submitting, the page reports the proof received and stops offering a fresh upload. The order detail reads as awaiting verification. Both agree after the reload.",
    endResult:
      "The order is awaiting verification and is the fixture the admin verify case reads.",
  },
  "checklist-buying-my-orders-manual-payment-reupload-note-visible-to-buyer": {
    roles: ["buyer", "admin"],
    startPage: "/user/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and request a proof re-upload on that order, with the note 'QA Note reupload — the reference is unreadable.'.",
      "Sign out and sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and read that order's row and its detail.",
      "Read whether the admin's note is shown to the buyer.",
      "Open the payment page and read whether the upload form is active again and what the deadline shows.",
      "Upload a fresh proof and submit.",
      "Read the order's state afterwards.",
    ],
    inputs: { note: "QA Note reupload — the reference is unreadable." },
    expectedBehaviour:
      "The admin's note reaches the buyer — a re-upload request with no visible reason leaves them resubmitting the same thing. The corrected upload must CLEAR the requested state, or the order is invisible to both the auto-approve sweep and the admin queue and stalls indefinitely.",
    expectedUiState:
      "The note is readable on the buyer's order. The payment page is active with an extended deadline. After the fresh upload the order reads as awaiting verification rather than staying in the requested state.",
    expectedData: { stateAfterReupload: "awaiting verification" },
    endResult:
      "The order is back in the review queue with the buyer's second proof.",
  },
  "checklist-buying-my-orders-manual-payment-rejected-state": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and find an order whose payment was rejected.",
      "Read its row and its detail.",
      "Check the rejection is stated plainly rather than the order simply reading as cancelled.",
      "Read whether the reason given is visible to the buyer.",
      "Check no upload form is offered any more.",
      "Read whether the items are back in stock on their product pages.",
    ],
    expectedBehaviour:
      "A rejected payment cancels the order and restores its stock, and the buyer is told which happened. It also triggers a temporary ban cascade against the account — so the buyer seeing only 'cancelled' with no explanation is left unable to connect that to the restriction they then hit.",
    expectedUiState:
      "The order states that the payment was rejected, with whatever reason was recorded, and offers no further upload. The items read as in stock again on their product pages.",
    endResult:
      "Read-only. If no rejected order exists, answer null rather than creating one — rejecting as fraud bans a real account for seven days.",
  },
  "checklist-buying-my-orders-order-lifecycle-emails-arrive": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as an account whose inbox you can open and confirm order emails are enabled in its notification settings.",
      "Place an order and note the time.",
      "Open the inbox and wait up to five minutes for a confirmation email.",
      "Read its From name, its subject and its body.",
      "Have the seller mark the order shipped, then check the inbox again.",
      "Click a link inside each email and read where it lands.",
      "Compare each email's figures against the order itself.",
    ],
    expectedBehaviour:
      "Each lifecycle transition sends its own templated email. The dispatcher fills in the template and the destination from the notification's type and related record rather than requiring each caller to supply them — which is why almost no caller used to, and every type shipped the same bare one-line body.",
    expectedUiState:
      "Confirmation and shipped emails both arrive within a few minutes, from a sender whose display name reads 'LetItRip' exactly. Each has a real templated body rather than a single unstyled sentence, its figures match the order, and its links open the live site.",
    endResult:
      "Both emails exist. An in-app notification with no email, while email is enabled for that type, is the failure this case separates from a delivery problem.",
  },
};
