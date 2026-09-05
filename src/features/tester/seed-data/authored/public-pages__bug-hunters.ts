/*
 * WHY: Authored six-part procedures for the public-pages/bug-hunters page.
 * WHAT: 3 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * The leaderboard exists to credit PEOPLE, which is why the bot account carries
 * isBot and must not appear on it — a runner that works all 994 cases would top
 * the board permanently and make it worthless as recognition.
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
  "checklist-public-pages-bug-hunters-leaderboard-loads": {
    roles: ["guest"],
    startPage: "/bug-hunters",
    steps: [
      "Open /bug-hunters in a private window with no session.",
      "Read the rows from the top and note each name and confirmed-bug count.",
      "Check that the counts descend from the first row to the last.",
      "Look for 'Mock User 18' and read the count beside it.",
      "Look for the Claude tester account by name anywhere in the list.",
    ],
    inputs: { seededHunter: "Mock User 18", seededBugCount: 1 },
    expectedBehaviour:
      "The board ranks testers by confirmed-bug count, highest first, and is fed by the demo fixture under Admin (Testing) → Bug Hunter Rewards. The bot account is excluded because it carries isBot — credit belongs to people, and a runner working the whole checklist would otherwise sit at the top forever.",
    expectedUiState:
      "'Mock User 18' appears with 1 confirmed bug. Counts never increase as you read down the list. The Claude tester account does not appear at all.",
    expectedData: { botAccountOnLeaderboard: 0 },
    endResult:
      "Read-only; nothing persists. A bot row on the board is a fail even if the ordering is otherwise correct.",
  },
  "checklist-public-pages-bug-hunters-leaderboard-empty-state": {
    roles: ["admin", "guest"],
    startPage: "/bug-hunters",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/tester-feedback and find the confirmed bug credited to 'Mock User 18'.",
      "Un-confirm it, so no confirmed bugs remain.",
      "Open /bug-hunters in a private window with no session.",
      "Read the page.",
      "Return to /admin/tester-feedback and confirm the bug again.",
      "Reload /bug-hunters in the private window.",
    ],
    expectedBehaviour:
      "With nothing to rank the page shows a named empty state rather than a blank container or an error. Zero rows is a normal condition for this page on a new install, not a failure.",
    expectedUiState:
      "With no confirmed bugs the page reads 'No confirmed bugs yet' or equivalent, inside the normal site chrome. It is not a blank white page, not an error boundary, and not a heading with nothing under it. After re-confirming, 'Mock User 18' is back.",
    expectedData: { emptyStateShown: true },
    endResult:
      "The confirmation is restored by the final step, so the leaderboard-loads case above still has its fixture. Leaving it un-confirmed silently breaks that case.",
  },
  "checklist-public-pages-bug-hunters-leaderboard-footer-link": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Scroll to the footer and find the Support column.",
      "Read the links in that column.",
      "Click 'Bug Hunters'.",
      "Read the address bar and the page.",
    ],
    expectedBehaviour:
      "The leaderboard is reachable from the footer. A page with no nav entry is exactly as unfinished as a nav entry with no page — this is the first half of that pair.",
    expectedUiState:
      "A 'Bug Hunters' link is present in the footer's Support column and clicking it lands on /bug-hunters with the leaderboard rendered. Not a 404 and not a redirect to /.",
    expectedData: { footerLinkHref: "/bug-hunters" },
    endResult: "Read-only; nothing persists.",
  },
};
