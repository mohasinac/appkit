/*
 * WHY: Authored six-part procedures for the account-auth/testing-program checklist page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * This page used to be split across two modules, `--admin` and nothing else, a
 * convention the deleted authoring bot needed because it batched a page by the
 * identity it ran as. Hand-written, one file per page is the whole rule, and the
 * split only made the five buyer-side cases easy to lose track of — which is what
 * happened: five of six sat unauthored while the page looked started.
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
  "checklist-account-auth-testing-program-admin-tester-access": {
    roles: ["admin"],
    startPage: "/user/tester",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /user/tester.",
      "Read the group headings down the page.",
      "Expand the 'Buying' group and then the 'Cart' page inside it.",
      "Expand the 'Admin (Testing)' group.",
    ],
    inputs: { email: "admin@letitrip.in" },
    expectedBehaviour:
      "An admin reaches the Tester Hub on the strength of their role alone, without an isTester flag, and sees the same catalogue a tester does — including the adminOnly cases, which a plain tester without canTestAdmin does not get.",
    expectedUiState:
      "/user/tester renders the grouped checklist rather than a 'Testers only' warning. The Buying group expands to its pages and the Admin (Testing) group is present and expandable.",
    expectedData: { adminOnlyGroupVisible: true },
    endResult:
      "Reloading /user/tester still shows the full checklist. Nothing is written by this case; it is a read-only access check.",
  },
  "checklist-account-auth-testing-program-admin-testing-section": {
    roles: ["admin"],
    startPage: "/admin/dashboard",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/dashboard.",
      "Expand the 'Testing' section in the admin sidebar.",
      "Click 'Test Cases' and note where it lands.",
      "Go back to /admin/dashboard and expand 'Testing' again.",
      "Click 'Results' and note where it lands.",
    ],
    inputs: { email: "admin@letitrip.in" },
    expectedBehaviour:
      "The Testing section carries both links and each one reaches a real page — 'Test Cases' to /admin/tester-checklist, the admin-managed catalogue, and 'Results' to /admin/tester-feedback, where answers are triaged. A nav entry pointing at a page that does not exist is the failure this catches.",
    expectedUiState:
      "The sidebar shows a 'Testing' section holding exactly the links 'Test Cases' and 'Results'. Clicking each renders its page with content, not a 404 and not an empty shell.",
    expectedData: {
      testCasesHref: "/admin/tester-checklist",
      resultsHref: "/admin/tester-feedback",
    },
    endResult:
      "After reload the Testing section still holds both links and both still resolve. Read-only; nothing persists.",
  },
  "checklist-account-auth-testing-program-tester-flag-live-refresh": {
    roles: ["admin", "buyer"],
    startPage: "/user/tester",
    steps: [
      "In browser window A, sign in as karthik.new@gmail.com / TempPass123! and open /user/tester.",
      "Leave window A open on that page without reloading it for the rest of this case.",
      "In a separate browser window B, sign in as admin@letitrip.in / TempPass123!.",
      "In window B open /admin/users and search for karthik.new@gmail.com.",
      "Open that user and set the 'Is tester' flag to on, then save.",
      "Return to window A and navigate between /user and /user/tester using the sidebar, without reloading.",
      "Keep navigating that way for up to 6 minutes.",
      "In window B, set 'Is tester' back to off for karthik.new@gmail.com and save.",
    ],
    inputs: { testerEmail: "karthik.new@gmail.com", isTester: true },
    expectedBehaviour:
      "The client session re-reads role, isTester, canTestAdmin, disabled and storeId on the 5-minute activity ping, so a flag an admin flips reaches an already-open tab without a sign-out. Before this was fixed those fields refreshed only on login or a full page reload, so the grant was invisible for as long as the tab stayed open.",
    expectedUiState:
      "Window A starts on /user/tester showing 'Testers only' — karthik.new@gmail.com has no tester flag. Within about 5 minutes, and with no reload and no re-login, the same page starts rendering the checklist instead. What must not happen is the warning persisting indefinitely until the tab is reloaded.",
    expectedData: { isTester: true },
    endResult:
      "Window A gains access without reloading. The flag is set back to off in the final step so karthik.new@gmail.com stays a plain buyer for other cases.",
  },
  "checklist-account-auth-testing-program-tester-hub-answer-saves": {
    roles: ["buyer"],
    startPage: "/user/tester",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/tester.",
      "Expand the 'Buying' group and then the 'Cart' page.",
      "Click 'Yes' on the first case in that page.",
      "Type 'QA Comment testing-program-tester-hub-answer-saves' in that case's comment box.",
      "Wait for the save indicator to settle without touching the browser reload button.",
      "Reload the page.",
      "Expand the 'Buying' group and then the 'Cart' page.",
    ],
    inputs: {
      answer: "yes",
      comment: "QA Comment testing-program-tester-hub-answer-saves",
    },
    expectedBehaviour:
      "The answer and the comment are written against a document keyed on tester and case together, so re-answering updates that one row rather than accumulating duplicates. The page does not navigate or reload to save.",
    expectedUiState:
      "The 'Yes' control becomes selected and a saved indicator appears, with no full-page flash. After reload the same case still shows 'Yes' selected and the comment text still in its box.",
    expectedData: {
      answer: "yes",
      comment: "QA Comment testing-program-tester-hub-answer-saves",
    },
    endResult:
      "The answer and comment survive the reload. A save that appears to work and is gone after F5 is exactly the failure this case exists to catch.",
  },
  "checklist-account-auth-testing-program-tester-hub-loads": {
    roles: ["buyer"],
    startPage: "/user/tester",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/tester.",
      "Read the group headings down the page.",
      "Expand the 'Buying' group.",
      "Expand the 'Cart' page inside it.",
      "Expand a case's 'Steps' toggle.",
    ],
    inputs: { email: "tester@letitrip.in" },
    expectedBehaviour:
      "The whole catalogue loads, grouped and then sub-grouped by page, and each case can be opened to reveal its roles, start page, steps, input values, expectations and end result. A tester without canTestAdmin does not see the Admin (Testing) group at all.",
    expectedUiState:
      "Group headings are visible — Account & Auth, Buying, Selling, Content & Discovery, Community & Support, Design & UX, Public & Marketing Pages, Page Wiring, CTA & Action Rows, Addresses, Search & navigation, Money Flows. Expanding Buying reveals its pages, and expanding a case shows its procedure rather than only the one-line label.",
    expectedData: { adminOnlyGroupVisible: false },
    endResult:
      "Reloading keeps the checklist rendered. Read-only; nothing is written. An empty hub, or one showing labels with no procedure behind them, both fail.",
  },
  "checklist-account-auth-testing-program-tester-hub-search": {
    roles: ["buyer"],
    startPage: "/user/tester",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/tester.",
      "Type coupon in the search box.",
      "Read the results.",
      "Clear the box and type /store/payouts instead.",
      "Read the results.",
      "Clear the box and type zzzznope instead.",
      "Read the results.",
    ],
    inputs: { titleQuery: "coupon", routeQuery: "/store/payouts", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Search matches on the case title AND on the route it links to, so a tester who knows only the page they are on can find its cases. It filters — it does not merely highlight while still listing everything.",
    expectedUiState:
      "'coupon' narrows the list to coupon-related cases. '/store/payouts' returns the payout cases, which is the whole point of route matching — those titles do not contain the word 'payouts' as typed with a slash. 'zzzznope' returns an empty state with a readable message, NOT the full unfiltered checklist.",
    endResult:
      "The nonsense query is the control: if it returns everything, the box is not filtering and the two real queries proved nothing. Read-only; nothing persists.",
  },
};
