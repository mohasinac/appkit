/*
 * WHY: Authored six-part procedures for content-discovery/event-detail-subroutes.
 * WHAT: 8 cases, keyed by full checklist id.
 *
 * 🛑 ALL 29 EXISTING EVENT CASES STOP AT THE INDEX. `/events/[id]/` has four
 * subroutes — participate, leaderboard, winner, spin-results — and none of them
 * had a single case. Several real defects were found on exactly these pages by
 * hand during the 2026-09 run, which is the ordinary consequence of a surface
 * nobody has a procedure for.
 *
 * Fixtures are named by id because event behaviour is type- and status-specific:
 * a poll and a raffle share a route and share almost nothing else, and "open an
 * event" is a different test every run.
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
  "checklist-content-discovery-event-detail-subroutes-detail-tabs-match-event-type": {
    roles: ["guest"],
    startPage: "/events/event-favourite-blader-poll",
    steps: [
      "Open /events/event-favourite-blader-poll — a poll.",
      "Write down every tab shown.",
      "Open /events/event-original-series-clearance — a sale.",
      "Write down its tabs.",
      "Open /events/event-win-burst-regalia-genesis — a raffle.",
      "Write down its tabs.",
    ],
    inputs: {
      pollEvent: "event-favourite-blader-poll",
      saleEvent: "event-original-series-clearance",
      raffleEvent: "event-win-burst-regalia-genesis",
    },
    expectedBehaviour:
      "The tab bar is derived from the event's type. A tab offered for a type that cannot have it leads to a page with nothing to render — and a blank panel reads as a loading failure rather than as a tab that should not exist.",
    expectedUiState:
      "The poll shows no Spin Results and no Winner tab. The sale shows no Leaderboard. The raffle shows a Winner tab.",
    expectedData: { tabWithNoContentShown: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-event-detail-subroutes-participate-records-an-entry": {
    roles: ["buyer"],
    startPage: "/events/event-favourite-blader-poll",
    steps: [
      "Sign in as the buyer rehan.sheikh@gmail.com / TempPass123!.",
      "Open /events/event-favourite-blader-poll.",
      "Open its Participate tab.",
      "Submit the first available option.",
      "Reload the page.",
      "Read what the Participate tab shows now.",
    ],
    inputs: { eventId: "event-favourite-blader-poll" },
    expectedBehaviour:
      "Participation writes an entry and the page reflects it afterwards. A write that succeeds while the screen keeps offering the form is the classic split between behaviour and UI state — and it leads a user to submit repeatedly.",
    expectedUiState:
      "After the reload the tab shows the submitted answer or a 'you have taken part' state, not the blank form again.",
    expectedData: { entryPersisted: true },
    endResult: "The entry is still recorded after a second reload.",
  },

  "checklist-content-discovery-event-detail-subroutes-participate-twice-is-refused": {
    roles: ["buyer"],
    startPage: "/events/event-favourite-blader-poll",
    steps: [
      "Sign in as the buyer rehan.sheikh@gmail.com / TempPass123! and open /events/event-favourite-blader-poll.",
      "Participate once if you have not already.",
      "Reload, and try to participate a second time with a different option.",
      "Read what happens.",
      "Open /events/event-favourite-blader-poll, then its Leaderboard tab, and read the total entry count. This case reads the state the previous one left behind, so run them in order — but it still has to start somewhere, and the index is not it.",
    ],
    inputs: { eventId: "event-favourite-blader-poll" },
    expectedBehaviour:
      "A second entry from the same account is refused with a reason. Silently accepting it doubles that account's weight in the result, which is invisible until somebody reconciles the entry count against the participant count.",
    expectedUiState:
      "A clear refusal naming the reason. The entry total does not rise by a second entry from this account.",
    expectedData: { duplicateEntryAccepted: false },
    endResult: "Exactly one entry for this account survives a reload.",
  },

  "checklist-content-discovery-event-detail-subroutes-leaderboard-ranks-by-a-real-number": {
    roles: ["guest"],
    startPage: "/events/event-favourite-blader-poll/leaderboard",
    steps: [
      "Open /events/event-favourite-blader-poll and open its Leaderboard tab.",
      "Read the number beside each of the first five rows — the vote or score the row is ranked on.",
      "Check that those numbers are in descending order.",
      "Read the total entry count the event reports.",
      "Count the rows the leaderboard lists, paging if needed.",
    ],
    inputs: { eventId: "event-favourite-blader-poll" },
    expectedBehaviour:
      "The leaderboard orders by a stored number and covers the same entries the event counts. A ranking that is merely insertion order looks correct whenever the data happens to arrive sorted, so the descending check has to be explicit.",
    expectedUiState:
      "The numbers descend down the list, and the number of entries listed matches the count the event reports. A leaderboard showing no number at all beside each row is the failure — there is then nothing it can be ranking by.",
    expectedData: { scoresDescending: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-event-detail-subroutes-winner-page-before-draw": {
    roles: ["guest"],
    startPage: "/events/event-win-burst-regalia-genesis/winner",
    steps: [
      "Open /events/event-win-burst-regalia-genesis — an ACTIVE raffle that has not been drawn.",
      "Open its Winner tab.",
      "Read the page.",
    ],
    inputs: { eventId: "event-win-burst-regalia-genesis" },
    expectedBehaviour:
      "An undrawn raffle has no winner, and the page must say so. A blank panel is indistinguishable from a failed load, and any name shown here before a draw is fabricated — which on a prize event is the worst possible thing to render.",
    expectedUiState:
      "A clear statement that the draw has not happened yet, ideally with when it will. No name, no masked name, no empty winner card.",
    expectedData: { winnerNameShown: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-event-detail-subroutes-winner-page-after-draw": {
    roles: ["guest"],
    startPage: "/events/event-won-original-set-raffle/winner",
    steps: [
      "Open /events/event-won-original-set-raffle — an ENDED raffle with a recorded winner.",
      "Open its Winner tab.",
      "Read the winner shown and the prize named.",
      "Open the event's Overview and compare the prize named there.",
    ],
    inputs: { eventId: "event-won-original-set-raffle" },
    expectedBehaviour:
      "The winner page reads the winner recorded on the event. The displayed name is masked, as every other public surface masks a user's name.",
    expectedUiState:
      "A winner is named in masked form and the prize matches what the Overview describes.",
    expectedData: { winnerShown: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-event-detail-subroutes-cancelled-event-refuses-participation": {
    roles: ["buyer"],
    startPage: "/events/event-x-launch-raffle-cancelled",
    steps: [
      "Sign in as the buyer rehan.sheikh@gmail.com / TempPass123!.",
      "Open /events/event-x-launch-raffle-cancelled — a CANCELLED raffle.",
      "Read the event header for its status.",
      "Open the Participate tab.",
      "Try to take part.",
    ],
    inputs: { eventId: "event-x-launch-raffle-cancelled" },
    expectedBehaviour:
      "A cancelled event accepts nothing. The status is checked server-side as well as hidden in the UI: a Participate tab that merely hides its button still has an endpoint behind it.",
    expectedUiState:
      "The header says Cancelled, and the Participate tab explains that the event is closed rather than offering a form.",
    expectedData: { participationAccepted: false },
    endResult: "No entry is recorded; the entry count is unchanged after a reload.",
  },

  "checklist-content-discovery-event-detail-subroutes-guest-sees-event-but-is-prompted": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open a private window with no session.",
      "Open /events/event-favourite-blader-poll.",
      "Read the Overview — the title, the description and the dates.",
      "Open the Participate tab.",
      "Read what it offers.",
    ],
    inputs: { eventId: "event-favourite-blader-poll" },
    expectedBehaviour:
      "An event is public reading and gated taking-part. Being prompted to sign in IS the expected result — the failure to look for is a hard redirect off the page, which loses the visitor the content they came for, or a form that submits and fails.",
    expectedUiState:
      "The event's own content is readable. Participate shows a sign-in prompt rather than a form, and nothing 404s or bounces to /unauthorized.",
    expectedData: { eventContentReadableByGuest: true },
    endResult: "No entry is recorded and no session is created.",
  },
  /*
   * 🛑 SPLIT IN TWO, 2026-09-29, after this case failed for a reason that was
   * not a bug in the code it was testing.
   *
   * It asserted that /events/{id}/spin-results lists "this account's own spins".
   * The route was a PUBLIC feed — `getSpinResultsCached(id)` took only the event
   * id and returned the ten most recent spins across all users — so read by a
   * buyer who had never spun it listed three strangers' prizes and showed no
   * empty state, because from the feed's point of view nothing was empty.
   *
   * Both readings turned out to be wanted, so the page now has two sections and
   * there are two cases. Rewriting the single case to assert whatever the code
   * already did would have made it a tautology; deleting the account-scoped
   * claim would have thrown away the one a human actually cared about.
   */
  "checklist-content-discovery-event-detail-subroutes-spin-results-subroute": {
    roles: ["buyer"],
    startPage: "/events/event-daily-beyblade-pull-wheel/spin-results",
    steps: [
      "Sign in as the buyer rehan.sheikh@gmail.com / TempPass123!.",
      "Open /events/event-daily-beyblade-pull-wheel — a SPIN_WHEEL event, active, with real spinPrizes and spinMaxPerUser of 2.",
      "Read which tabs the detail page offers and check a results tab is among them.",
      "Open /events/event-daily-beyblade-pull-wheel/spin-results directly by URL.",
      "Find the 'Last 10 Spin Results' section — the PUBLIC feed of everyone's recent spins, which is a different section from 'Your Spins'.",
      "Read the participant name on each row.",
    ],
    inputs: {
      eventId: "event-daily-beyblade-pull-wheel",
    },
    expectedBehaviour:
      "The public feed lists recent spins by ANY participant, and every display name is masked. This is a public page on a public event, so a real winner's full name must not be published beside the prize they won — the same rule that applies to bidder names on public bid history.",
    expectedUiState:
      "A 'Last 10 Spin Results' heading over rows of participant, prize and relative time. Every signed-in participant's name is masked to initials in the 'R*** K***' shape; a guest row reads 'Guest'. No row shows a full first and last name.",
    expectedData: { fullNamesVisibleInPublicFeed: 0 },
    endResult:
      "Read-only. Nothing is spun and nothing is written.",
  },

  "checklist-content-discovery-event-detail-subroutes-my-spins-scoped-to-viewer": {
    roles: ["buyer"],
    startPage: "/events/event-daily-beyblade-pull-wheel/spin-results",
    steps: [
      "Sign in as the buyer rehan.sheikh@gmail.com / TempPass123!.",
      "Open /events/event-daily-beyblade-pull-wheel/spin-results.",
      "Find the 'Your Spins' section — it sits ABOVE the public 'Last 10 Spin Results' feed.",
      "Before spinning, read what it shows. It must name YOUR state, not the event's: 'You have not spun on this event yet.' Reading 'No spins yet' here would be the bug this case exists for, because the public feed below is not empty.",
      "Go back to the event, spin once, and read the prize awarded.",
      "Return to spin-results and check 'Your Spins' lists exactly that one spin with that prize.",
      "Confirm no other participant's row appears inside 'Your Spins' — the strangers visible in the feed below must not be in your own section.",
    ],
    inputs: {
      eventId: "event-daily-beyblade-pull-wheel",
      spinMaxPerUser: 2,
    },
    expectedBehaviour:
      "'Your Spins' is scoped to the signed-in caller and answers what did I win. Its empty state is about the viewer, so someone who has never spun is told so plainly rather than being shown other people's prizes with nothing to distinguish them.",
    expectedUiState:
      "Before spinning: a 'Your Spins' heading over the text 'You have not spun on this event yet.' After one spin: exactly one row naming the prize just awarded and its relative time, and no participant names at all — every row in this section is yours by construction.",
    expectedData: { mySpinRowsBeforeSpinning: 0, mySpinRowsAfterOneSpin: 1 },
    endResult:
      "One spin is recorded against this account and 'Your Spins' still shows it after a reload. Signed out, the section reads 'Sign in to see your own spins and the prizes you have won.' rather than showing anyone else's.",
  },
};
