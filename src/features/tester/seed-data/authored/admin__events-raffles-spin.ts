/*
 * WHY: Authored six-part procedures for the admin/events-raffles-spin page.
 * WHAT: 8 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE ADMIN EVENT TYPE PICKER HAS BEEN WRONG BEFORE in a way no query error
 * surfaced: it offered three types the event union has never had, so each matched
 * zero rows forever, while omitting five real ones. Two cases here read the picker
 * and the filter chips against the real union rather than trusting either.
 *
 * The two "view before deciding" cases are the same defect as the moderation
 * pages: a row that offers Confirm and Waitlist without showing the entry lets an
 * admin act on a record they were never able to read.
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
  "checklist-admin-events-raffles-spin-raffle-create-open": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events/new and read every option in the event type picker.",
      "Write the list down and compare it against the real event types the catalogue supports.",
      "Create an event titled 'QA Event raffle-open' with an open raffle, a prize, a start date of today and an end date a week out.",
      "Save, RELOAD, and read the raffle type, the prize and the dates.",
      "Sign out, sign in as rehan.sheikh@gmail.com / TempPass123!, and enter the raffle from its public page.",
      "Sign back in as admin and read the entry count on the event.",
    ],
    inputs: { title: "QA Event raffle-open", raffleType: "open" },
    expectedBehaviour:
      "The type picker offers every real event type and no invented ones. An option whose value is not a stored type matches nothing forever with no error — the picker once offered three such and omitted five real ones, under a comment deferring the fix.",
    expectedUiState:
      "The picker's options match the real type list, with no contest, giveaway or flash-sale style values that the union does not carry, and with lottery present. After the reload the raffle settings hold, and the buyer's entry raises the count.",
    endResult: "Leave the event in place — the draw case reads it.",
  },
  "checklist-admin-events-raffles-spin-raffle-create-top-n-scorers": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Create an event titled 'QA Event raffle-scorers' with a top-N-scorers raffle, N set to 3, and a prize.",
      "Save, RELOAD, and read the raffle type and the N value.",
      "Open the public page and read how the Overview tab describes who can win.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and enter, then read the Leaderboard tab.",
      "Read whether the leaderboard is ordered by score and whether the qualifying cut-off is stated.",
    ],
    inputs: { title: "QA Event raffle-scorers", raffleType: "top_n_scorers", topN: 3 },
    expectedBehaviour:
      "A top-N-scorers raffle draws from the highest-scoring entries, so the leaderboard must rank by score and the public page must state how many qualify. Ranking by entry time instead silently changes who can win, and nothing errors.",
    expectedUiState:
      "After the reload the type and N hold. The public Overview states the rule, and the Leaderboard is ordered by score with the cut-off named. A leaderboard ordered by entry time is the failure.",
    endResult: "Delete the event after reading it.",
  },
  "checklist-admin-events-raffles-spin-raffle-create-top-n-participants": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Create an event titled 'QA Event raffle-participants' with a top-N-participants raffle, N set to 3, and a prize.",
      "Save, RELOAD, and read the raffle type and N.",
      "Open the public page and read how the Overview tab describes who can win.",
      "Compare that description against the scorers event's.",
      "Enter as rehan.sheikh@gmail.com / TempPass123! and compare the two leaderboards' ordering.",
    ],
    inputs: { title: "QA Event raffle-participants", raffleType: "top_n_participants", topN: 3 },
    expectedBehaviour:
      "This variant draws by participation rather than by score — a genuinely different rule from the scorers one. The two exist side by side precisely so the difference is checkable: identical leaderboards on both means the raffle type is not reaching the ranking.",
    expectedUiState:
      "The type and N hold after the reload, and the Overview describes a different rule from the scorers event. The two leaderboards order differently. Identical ordering on both is the failure.",
    endResult: "Delete the event after reading it.",
  },
  "checklist-admin-events-raffles-spin-raffle-draw-winner": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open 'QA Event raffle-open' in the admin and read the entry list.",
      "Trigger the raffle draw and read the winner named.",
      "RELOAD and read the winner again.",
      "Read whether the winner's name and entry are both recorded on the event.",
      "Sign in as the winning buyer and check they were notified.",
      "Sign back in as admin and attempt to draw a second time, reading what happens.",
    ],
    expectedBehaviour:
      "The draw picks once with real randomness, records the winner on the event, and notifies them. A second draw must be refused — redrawing replaces a winner who has already been told they won, and the notification cannot be recalled.",
    expectedUiState:
      "The winner is named and survives the reload. The event records both the winner and their entry. The buyer has a notification. The second draw attempt is refused rather than producing a new winner.",
    expectedData: { drawsPermitted: 1 },
    endResult:
      "Delete the event afterwards. A second draw succeeding is the most serious failure on this page.",
  },
  "checklist-admin-events-raffles-spin-spin-wheel-create": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Create an event titled 'QA Event spin-create' of the spin-wheel type.",
      "Define three prizes with labels and weights, set a maximum of 2 spins per user, and set a spin window covering today.",
      "Save, RELOAD, and read every prize, weight, the maximum and the window.",
      "Open the public page and read the wheel and its segments.",
      "Check the wheel shows the prize labels and does NOT disclose their weights.",
    ],
    inputs: { title: "QA Event spin-create", prizeCount: 3, maxPerUser: 2 },
    expectedBehaviour:
      "Prizes, weights, the per-user maximum and the window all round-trip. Weights are the odds and belong server-side — a public wheel that renders them tells every visitor which segment is worthless.",
    expectedUiState:
      "After the reload all four groups of settings hold. The public wheel shows three labelled segments and no weight values anywhere on the page or in its source.",
    expectedData: { weightsInPublicSource: 0 },
    endResult: "Leave the event in place — the limits case reads it.",
  },
  "checklist-admin-events-raffles-spin-spin-wheel-limits-enforced": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and open 'QA Event spin-create'.",
      "Spin once and read the prize and the remaining count.",
      "Spin a second time and read the remaining count.",
      "Attempt a third spin and read the refusal.",
      "RELOAD the page and attempt another spin.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!, then narrow the spin window so it is closed.",
      "Sign back in as the buyer and attempt a spin, reading the refusal.",
    ],
    inputs: { maxPerUser: 2 },
    expectedBehaviour:
      "The per-user cap and the window are both enforced server-side. A cap held in the browser resets on refresh and is no cap at all, and the two refusals must read differently — 'no spins left' and 'the window is closed' are different facts and a single generic message tells the buyer neither.",
    expectedUiState:
      "The remaining count falls with each spin and the third is refused naming the limit. After the reload it is still refused. With the window closed the refusal names the window instead. A fresh spin available after a reload is the failure.",
    expectedData: { spinsAfterReload: 0 },
    endResult: "Delete the event afterwards.",
  },
  "checklist-admin-events-raffles-spin-event-entries-admin-view": {
    roles: ["admin"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open an event's entries page and read every column.",
      "Read every status filter offered and select each, noting any that returns nothing.",
      "For each empty filter, check the unfiltered list for rows of that status.",
      "Read the row actions offered and check at least one lets you VIEW an entry.",
      "Use the search if one is offered, then search zzzznope and read the count.",
      "Check whether buyer email addresses are shown in full.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Entries are readable and filterable, and every status chip names a value entries actually hold. The entry document carries the participant's email, which is PII — how much of it this list exposes is worth recording rather than assuming.",
    expectedUiState:
      "Every filter returns its own rows or is empty with none unfiltered either. A view affordance exists alongside the actions. 'zzzznope' returns none. Record exactly how buyer emails are displayed.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-events-raffles-spin-event-entries-view-before-deciding": {
    roles: ["admin"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the entries page for an event that collects responses — a poll, survey or feedback event.",
      "Find a row offering Confirm, Waitlist or Cancel.",
      "WITHOUT using any of those, look for a way to read the entry's actual content first.",
      "Open the entry and read the participant's response in full.",
      "Return to the list and check the same content is reachable from the row itself.",
    ],
    expectedBehaviour:
      "An admin can read an entry before deciding on it. A row offering Confirm, Waitlist and Cancel without showing what was submitted is a decision made blind — the same shape as approving a catalogue submission whose photos were never rendered, or confirming a bug report whose comment and screenshot are not on screen.",
    expectedUiState:
      "The entry's response is readable from the list or from a detail view reachable from the row, before any action is taken. A row with only mutations is the failure, and it looks complete because the buttons work.",
    endResult:
      "Read-only; take no action on any entry. Report whether the content was reachable WITHOUT deciding.",
  },
};
