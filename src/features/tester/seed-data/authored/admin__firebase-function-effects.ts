/*
 * WHY: Authored six-part procedures for the admin/firebase-function-effects page.
 * WHAT: 14 cases, keyed by full checklist id.
 *
 * 🛑 EVERY CASE HERE TESTS AN EFFECT, NEVER A FUNCTION.
 *
 * 55 Firebase functions are deployed — 28 scheduled, 20 Firestore triggers, 7
 * HTTPS — and none had a checklist case. The reason is that the obvious way to
 * write one is untestable: "trigger the cron and confirm it ran" cannot be done
 * from a browser in a session, so every such case would be answered null
 * forever, which reads as coverage while providing none.
 *
 * So each case instead reads the thing the function is RESPONSIBLE FOR. A nightly
 * reconciler is tested by recounting what it reconciles; a settlement job by
 * whether the winner can pay; a self-triggering write-back by whether its
 * timestamp moves when nothing changed. All answerable in seconds, all able to
 * fail.
 *
 * Three of these are written against real, recorded incidents and would have
 * caught them: #92 (a trigger that self-triggered 1,017,548 times in 24h),
 * #60 (a settlement that produced an order nobody could pay), #102 (a reconciler
 * that could not express what it reconciled).
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const ADMIN = "Sign in as admin@letitrip.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-admin-firebase-function-effects-function-invocation-health-per-function": {
    roles: ["admin"],
    startPage: "/admin/maintenance",
    steps: [
      ADMIN,
      "Open the Firebase console for this project and go to Functions.",
      "Sort the function list by invocation count over the last 24 hours, highest first.",
      "Write down the top entry's count and the count of the tenth entry.",
      "Divide the first by the second.",
    ],
    expectedBehaviour:
      "No single function is running away from the rest. This is the case that would have caught Root Cause #92, where onShipmentHeaderWrite self-triggered 1,017,548 times in 24 hours against a 2,000,000/month free quota while every other function in the project sat between 0 and 95 — and the overage then blocked deploys and degraded production through the sibling Firestore read quota.",
    expectedUiState:
      "The per-function breakdown is on screen, sorted. The top function's count is of the same order as the rest of the active ones. A ratio in the thousands is the finding, and the function's name is quoted.",
    expectedData: { runawayFunctions: 0 },
    endResult:
      "Read-only; nothing persists. 🛑 Read the PER-FUNCTION breakdown, never the aggregate — the aggregate never names the culprit, which is exactly why #92 was found from a billing page rather than from monitoring.",
  },

  "checklist-admin-firebase-function-effects-function-errors-page-has-no-producer": {
    roles: ["admin"],
    startPage: "/admin/maintenance/function-errors",
    steps: [
      ADMIN,
      "Open /admin/maintenance/function-errors and read what it shows.",
      "Open /admin/maintenance/server-errors in another tab and read what it shows.",
      "Compare the two: note whether server-errors has rows while function-errors does not.",
    ],
    expectedBehaviour:
      "BEFORE: the page is expected to list Cloud Function failures. AFTER: it is empty, and it will remain empty no matter what breaks, because NOTHING IN PRODUCTION WRITES a serverErrors row with source \"function\". The only producer is wrapJobHandler, which is referenced solely by its own test. The sibling server-errors page has a real producer and should show rows, which is what makes the contrast legible.",
    expectedUiState:
      "function-errors renders an empty list or empty state. server-errors renders actual rows. Screenshot both, side by side if possible.",
    expectedData: { functionErrorRows: 0 },
    endResult:
      "🛑 ANSWER NO. This case is authored to FAIL against today's product, and that is deliberate: a case reading \"check that errors appear here\" would pass vacuously against a surface that can never populate. A red case with a screenshot is a tracked defect; a note in a document is not.",
  },

  "checklist-admin-firebase-function-effects-https-function-401-is-healthy-500-is-not": {
    roles: ["admin"],
    startPage: "/admin/maintenance",
    steps: [
      ADMIN,
      "Open the Firebase console's Functions list and copy the trigger URL of adminAnalytics.",
      "Open that URL in a new tab with no auth header and read the status and body.",
      "Repeat for storeAnalytics, promotionsApi, listingProcessor, triggerEventRaffle, assignSpinPrize and gateway.",
      "Write down the status code each one returned.",
    ],
    expectedBehaviour:
      "Every one of the seven answers 401. A 401 means the module LOADED and the auth gate ran — that is healthy, and it is the expected answer, not a failure. A 500 means the module failed at cold start, which is how Root Cause #69 served 500 on every route while the build reported READY.",
    expectedUiState:
      "Seven status codes are recorded. All are 401 (or 403). Any 500 is quoted with the function's name and whatever body it returned.",
    expectedData: { httpsFunctions: 7, fiveHundreds: 0 },
    endResult:
      "Read-only; nothing persists. 🛑 Do not record a 401 as a failure — that inversion is the single most likely way this case is answered wrongly.",
  },

  "checklist-admin-firebase-function-effects-counters-reconcile-effect-category-counts": {
    roles: ["admin"],
    startPage: "/categories",
    steps: [
      ADMIN,
      "Open /categories and write down the product count shown for the root category Spinning Tops.",
      "Open that category's own page and count the listings it actually shows, paging through if there is more than one page.",
      "Do the same for one leaf category further down the tree.",
      "Compare each displayed count against your recount.",
    ],
    expectedBehaviour:
      "The displayed count equals the recount, for both the root and the leaf. countersReconcile runs nightly and maintains two DIFFERENT numbers — metrics.productCount, the items filed directly under a row, and metrics.totalProductCount, that row plus every descendant. Root Cause 102: setMetrics took one pair of numbers and wrote it to both fields, so on any ancestor the row's own items were lost from its own rollup. 19 of 65 rows disagreed with a recount and every one was LOW.",
    expectedUiState:
      "Two categories are recounted and both match. Any mismatch is reported with three numbers: the displayed count, the recount, and which category.",
    endResult:
      "Read-only; nothing persists. A wrong number here never errors — it is simply a number — so the recount is the only thing that can detect it.",
  },

  "checklist-admin-firebase-function-effects-revenue-rollup-effect-dashboard-reads-one-doc": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      ADMIN,
      "Open /admin and read the revenue figures on the dashboard.",
      "Open /admin/orders, filter to delivered orders, and note roughly how many there are and their rough total.",
      "Compare the dashboard's figure against that rough total.",
      "Reload /admin once and confirm the figure is the same and appears without a long delay.",
    ],
    expectedBehaviour:
      "The dashboard shows a plausible revenue figure derived from a pre-computed rollup rather than a live scan of every order. revenueRollup exists specifically so this page is a single-document read — that is the pattern protecting the 50,000/day Firestore read quota, and a dashboard that scans instead is how that quota gets spent.",
    expectedUiState:
      "A revenue figure is present and is of the same order as the delivered orders suggest. Zero revenue while real delivered orders exist means the rollup did not run or wrote a shape the page cannot read.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-admin-firebase-function-effects-auction-settlement-effect-winner-gets-payable-line": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      ADMIN,
      "Open /admin/products and filter to auctions, then find one that has already ended with bids on it.",
      "Open it and note the winning bidder.",
      "Open that winner's account view from /admin/users and look for what the win produced.",
      "Establish whether the win left something the winner could actually pay for — a locked cart line reachable from checkout — or only a record that renders nowhere.",
    ],
    expectedBehaviour:
      "A settled auction leaves the winner a LOCKED cart line that reaches checkout through the auction lane. Root Cause #60: auctionSettlement used to write a document into the orders collection that was not an OrderDocument — flat productId/unitPrice fields instead of buyerId and items[], no paymentMethod, a Firestore auto-id instead of a semantic one. It rendered correctly in no orders list, no checkout accepted it, and the sweep that cleans up unpaid orders never saw it. There was no way, anywhere in the product, for a winner to pay.",
    expectedUiState:
      "The win is visible to the winner as something actionable. If it appears only as a row that cannot be opened or paid, that is the finding, and the auction id is quoted.",
    endResult:
      "Read-only — do not pay or cancel anything. The point is whether a payable path EXISTS, not whether it completes.",
  },

  "checklist-admin-firebase-function-effects-offer-expiry-effect-lapsed-offer-frees-the-cart": {
    roles: ["admin"],
    startPage: "/admin/offers",
    steps: [
      ADMIN,
      "Open /admin/offers and find an offer whose status is expired, or one whose deadline has clearly passed.",
      "Open it and note the buyer.",
      "Open that buyer's cart from the admin user view, or sign in as them if the fixture allows.",
      "Check whether a locked line for that offer is still sitting in their cart.",
    ],
    expectedBehaviour:
      "A lapsed offer is no longer actionable AND has left no locked line behind. runOfferExpiry sweeps three things in one pass — pending offers past expiresAt, ACCEPTED offers past checkoutDeadline, and unpaid auction wins. The third and second were added later than the first, and the function deliberately has no early return when the first query is empty, because the other two sweeps must still run.",
    expectedUiState:
      "The offer reads as expired and the buyer's cart has no leftover locked line for it.",
    expectedData: { leftoverLockedLines: 0 },
    endResult:
      "Read-only; nothing persists. 🛑 A leftover locked line is worse than it looks: the offer lane OUTRANKS the standard lane, so it blocks the buyer's entire cart, not merely that one offer.",
  },

  "checklist-admin-firebase-function-effects-payment-window-timeout-effect-expired-proof-window": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      ADMIN,
      "Open /admin/orders and filter to manual-payment orders awaiting payment.",
      "Find one whose payment deadline has already passed.",
      "Open it and read its status and its payment panel.",
      "Note whether it has been resolved by a sweep or is still sitting pending with an expired deadline.",
    ],
    expectedBehaviour:
      "An order past its 15-minute payment window has been resolved rather than left pending indefinitely. paymentWindowTimeout and paymentReviewAutoApprove are the two sweeps that stop a manual payment stalling forever — one cancels an unpaid window, the other auto-approves an unreviewed proof after two hours.",
    expectedUiState:
      "The order shows a resolved state consistent with its deadline having passed. An order still pending with a deadline hours in the past is the finding, with its id and its deadline quoted.",
    endResult: "Read-only — do not verify or reject the payment yourself; that would destroy the evidence.",
  },

  "checklist-admin-firebase-function-effects-rtdb-event-channels-are-pruned": {
    roles: ["admin"],
    startPage: "/admin/maintenance",
    steps: [
      ADMIN,
      "Open the Firebase console's Realtime Database for this project.",
      "Look at the auth_events, payment_events and bulk_events nodes and note roughly how many children each holds.",
      "Note the oldest timestamp you can see under each.",
      "Compare that age against the prune interval each is supposed to have.",
    ],
    expectedBehaviour:
      "The signal channels are being pruned rather than accumulating. cleanupRtdbEvents prunes auth_events at 3 minutes and payment_events and bulk_events at 15, and email_events at 1 hour. The email channel is deliberately the longest: a batch can take ten minutes between triggering a send and asserting on it, and a ping deleted mid-batch reads as \"no email was sent\" — a false negative in exactly the mechanism meant to prevent one.",
    expectedUiState:
      "Each channel holds only recent children. A node holding entries hours or days old means the prune is not running for it, and that node's name is quoted.",
    endResult:
      "Read-only — do not delete anything by hand. Note that auction-bids is deliberately NOT pruned and is not part of this case.",
  },

  "checklist-admin-firebase-function-effects-media-tmp-cleanup-effect-aborted-uploads-removed": {
    roles: ["admin"],
    startPage: "/admin/media",
    steps: [
      ADMIN,
      "Open /admin/media and begin uploading an image.",
      "Abandon the upload before it finalises — close the dialog or navigate away mid-upload.",
      "Return to /admin/media and look for the abandoned file.",
      "Reload once and look again.",
    ],
    expectedBehaviour:
      "An abandoned upload does not appear as a real, usable asset. Bytes land under a tmp/ prefix and are moved to a permanent path only by finalize; mediaTmpCleanup removes whatever never finalised. An un-finalised object showing up in the media library is the finding, because it can then be attached to a listing and will later vanish.",
    expectedUiState:
      "The media library shows no entry for the abandoned upload, either immediately or after the reload.",
    endResult:
      "If a stray entry was created, note its name so it can be cleaned up; do not leave it attached to any listing.",
  },

  "checklist-admin-firebase-function-effects-product-write-trigger-effect-stock-and-groups": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      ADMIN,
      "Open /admin/grouped-listings and pick a group, noting its member count and how many members it says are active.",
      "Note one member product's id.",
      "Open that product in /admin/products and set its stock quantity to 0, then save.",
      "Return to /admin/grouped-listings and reload, then read the same group's active member count.",
      "Set the product's stock back to its original value and confirm the count returns.",
    ],
    expectedBehaviour:
      "Changing one product's stock updates the derived state on the OTHER records that depend on it, without anyone editing them. onProductWrite / onProductStockChange recompute a grouped listing's activeMemberCount and visibilityStatus and keep bundles in sync. The effect is visible on the group, never on the product you edited — which is why a case that only re-reads the product would pass against a broken trigger.",
    expectedUiState:
      "The group's active member count drops by one after the stock change and returns after it is restored. A count that never moves is the finding.",
    endResult:
      "🛑 RESTORE THE STOCK. Leaving a seeded product at zero silently removes it from every public listing for every later case.",
  },

  "checklist-admin-firebase-function-effects-order-create-trigger-effect-staff-signal": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      ADMIN,
      "Open /admin/orders and note the most recent order's id and the time it was created.",
      "Open the admin notifications or inbox surface and look for a signal corresponding to that order.",
      "Note whether the signal exists, and whether there is exactly one rather than one per employee.",
    ],
    expectedBehaviour:
      "A new order leaves something an operator can notice, as ONE durable staff-visible record rather than a personal notification fanned out to every employee. The fan-out shape is what nearly exhausted a 100/day email allowance from a single event, so one row read by the admin inbox and counted by the daily digest is the correct shape.",
    expectedUiState:
      "A staff-visible signal exists for the recent order. If several identical signals exist, one per employee, that is a finding in its own right.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-admin-firebase-function-effects-shipment-trigger-no-op-guard-holds": {
    roles: ["admin"],
    startPage: "/admin/shipments",
    steps: [
      ADMIN,
      "Open /admin/shipments and open one shipment.",
      "Note its computed totals and the timestamp showing when those totals were last computed.",
      "Press Save without changing any field.",
      "Reload the shipment and read that timestamp again.",
      "Press Save unchanged a second time, reload, and read it once more.",
    ],
    expectedBehaviour:
      "Saving an unchanged shipment does NOT recompute its totals — the timestamp is identical all three times. This is Root Cause #92's exact mechanism: onShipmentHeaderWrite watches the collection it writes back to, and its only brake is a no-op guard. That guard compared with JSON.stringify, which is key-order sensitive, while Firestore returns map fields alphabetically and the code built them in construction order. The two strings could never match, so every write re-triggered — 1,017,548 invocations in 24 hours, which then blocked deploys and degraded production.",
    expectedUiState:
      "The totals-computed timestamp is byte-identical across all three readings. Any movement on an unchanged save means the guard is not holding, and that is a billing incident, not a cosmetic one.",
    expectedData: { timestampMovementsOnUnchangedSave: 0 },
    endResult:
      "No field is changed. 🛑 If the timestamp DOES move, stop and report immediately rather than saving again — each save is another round of the loop.",
  },

  "checklist-admin-firebase-function-effects-scheduled-job-count-matches-registry": {
    roles: ["admin"],
    startPage: "/admin/maintenance",
    steps: [
      ADMIN,
      "Open the Google Cloud console's Cloud Scheduler page for this project.",
      "Count the jobs listed and write the number down.",
      "Open the Firebase console's Functions list and count the entries with a scheduled trigger.",
      "Compare the two numbers.",
    ],
    expectedBehaviour:
      "The two counts match. Scheduler bills per REGISTERED job rather than per invocation, so a job with no matching function is paid for and dead, and a scheduled function with no job simply never runs — and nothing in the product reports either.",
    expectedUiState:
      "Two counts are written down and are equal. If they differ, name the jobs or functions that appear on only one side.",
    endResult:
      "Read-only; nothing persists. 🛑 RECOUNT rather than quoting a remembered number — this figure has drifted four separate times, which is exactly why the case asks for a count instead of stating one.",
  },
};
