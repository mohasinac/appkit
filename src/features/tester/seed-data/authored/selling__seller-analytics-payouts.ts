/*
 * WHY: Authored six-part procedures for the selling/seller-analytics-payouts page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A PAYOUT IS MONEY LEAVING THE PLATFORM, so several cases here read the FULL
 * deduction breakdown rather than only the net figure. A net amount alone cannot
 * distinguish a correct deduction from a wrong one, and the seller-side deduction
 * is deliberately uncapped where the buyer-facing platform fee is capped — so the
 * two are not expected to agree and a case that assumes they do is wrong.
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
  "checklist-selling-seller-analytics-payouts-view-analytics": {
    roles: ["seller"],
    startPage: "/store/analytics",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's analytics page and read every figure and chart on it.",
      "Write down any figure reading zero, a dash, or 'undefined'.",
      "Change the date range if one is offered and read the figures again.",
      "Compare the order count shown against the number of orders in /store/orders.",
      "Reload the page and check the figures are the same.",
    ],
    expectedBehaviour:
      "Analytics read from pre-computed rollups rather than scanning every order per request — that is the pattern this codebase uses to keep a dashboard load inside its read budget. A figure that fails to compute must read as unknown rather than as zero: zero is a claim, and it is the wrong one.",
    expectedUiState:
      "Figures and charts render with real values. The order count is consistent with the orders list. A dash for a genuinely unavailable metric is acceptable; a confident zero beside a list that clearly has rows is not.",
    endResult:
      "Read-only; nothing persists. Note any metric reading zero against visible data — that is the failure this case exists for.",
  },
  "checklist-selling-seller-analytics-payouts-view-payouts": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/payouts and read every row — period, gross, deductions, net and status.",
      "Read every status filter offered and select each in turn.",
      "Write down any filter returning zero rows, then check the unfiltered list for rows of that status.",
      "Read the sort dropdown's default and confirm it is one of the offered options.",
      "Open one payout row.",
    ],
    expectedBehaviour:
      "The list shows each payout with its own deductions rather than a bare net figure. Status filters use the values payouts actually hold — and a default sort that is not among the offered options opens the dropdown with nothing selected, which is a real defect on this listing family.",
    expectedUiState:
      "Rows show period, gross, deductions and net. Every status filter either returns its own rows or is empty with none in the unfiltered list either. The sort default is one of the options. Rows open a detail view.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-analytics-payouts-payouts-checkbox-select": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/payouts and tick the checkbox on one row.",
      "Read the bulk action bar that appears and the count it states.",
      "Click the row itself, away from the checkbox, and read what happens.",
      "Tick a second row and read the count again.",
      "Use select-all and read the count against the number of rows on the page.",
      "Clear the selection and check the bar disappears.",
    ],
    expectedBehaviour:
      "Selecting rows and opening a row are separate gestures — merely WIRING selection must not disable navigation. A card or row that stops opening the moment a selection handler exists, regardless of whether anything is selected, is the specific defect this checks.",
    expectedUiState:
      "Ticking a checkbox shows a bulk bar with an accurate count. Clicking the row body with nothing selected still opens the payout. Select-all matches the visible row count. Clearing hides the bar without leaving an empty strip behind.",
    endResult:
      "Clear the selection; nothing is mutated. A row that will not open while a checkbox exists is the failure.",
  },
  "checklist-selling-seller-analytics-payouts-payouts-detail-panel": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/payouts and open a payout's detail panel from the list.",
      "Write down every field label it shows, in order.",
      "Read the deduction lines and check they add up to gross minus net.",
      "Read the list of orders included in the payout.",
      "Close the panel and check the list is unchanged behind it.",
    ],
    expectedBehaviour:
      "The panel shows the full breakdown — gross, each deduction, net — and the orders that make it up. The arithmetic is the check: a net figure alone cannot distinguish a correct deduction from a wrong one, and a payout is money actually leaving.",
    expectedUiState:
      "Gross minus the listed deductions equals the net shown, to the paisa. The included orders are listed and identifiable. Any rounding gap is a finding, not a rounding artefact.",
    expectedData: { deductionsReconcile: true },
    endResult: "Read-only; close the panel without acting.",
  },
  "checklist-selling-seller-analytics-payouts-payouts-reminder-toggle": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/payouts and find the payout reminder toggle.",
      "Read its current state.",
      "Turn it OFF and save if a save is required.",
      "RELOAD the page and read the toggle's state.",
      "Turn it back on, save, and reload to confirm.",
    ],
    expectedBehaviour:
      "The preference persists server-side. Off is the direction worth testing when the default is on: a toggle that never saves reads back as its default and passes a test that only ever turns it on.",
    expectedUiState:
      "After the reload the toggle is still off. A toggle that has reverted to on is the failure, and the save will have reported success.",
    expectedData: { reminderEnabled: false },
    endResult:
      "The toggle is back on by the final step, so payout reminders are not left suppressed.",
  },
  "checklist-selling-seller-analytics-payouts-seller-payout-detail-full-page": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/payouts and open a payout's detail panel from the list.",
      "Write down every field label it shows.",
      "Note the payout's id and close the panel.",
      "Open that payout's standalone detail page directly by URL.",
      "Write down every field label it shows and compare the two lists.",
      "Reload the standalone page and confirm it still renders.",
    ],
    expectedBehaviour:
      "The panel and the page render from one shared content component, so their fields are identical by construction. The standalone page exists because a panel cannot be bookmarked, shared with a colleague, or reopened after a crash — and a payout is exactly the record someone needs to send to someone else.",
    expectedUiState:
      "Both surfaces show the same fields with the same values. The standalone page survives a reload with the same payout loaded. A field present in one and missing from the other means a second copy of the content component has appeared.",
    endResult: "Read-only; nothing persists.",
  },
};
