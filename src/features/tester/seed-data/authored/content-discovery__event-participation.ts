/*
 * WHY: Authored six-part procedures for the content-discovery/event-participation page.
 * WHAT: 12 case(s), keyed by full checklist id.
 *
 * Events were covered from the ADMIN side — creating them, configuring raffles and
 * spin wheels, drawing winners. What nobody had written was the participant's own
 * experience: joining, seeing their own entry, finding themselves on a leaderboard,
 * and learning that they won.
 *
 * That asymmetry is worth naming. An admin surface can look complete while the
 * participant sees nothing at all, because the two are different pages reading
 * different projections of the same record — and the admin one is the one that
 * gets built first and looked at most.
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

export const authored: Record<string, AuthoredCase> = {
  "checklist-content-discovery-event-participation-join-event-as-participant": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Open /events and pick an event whose status is active.",
      "Open it and find the control for joining.",
      "Use it.",
      "Read the outcome shown.",
      "Check it states whether the entry was confirmed or waitlisted, and why if waitlisted.",
    ],
    expectedBehaviour:
      "Joining produces an entry with an explicit status. Waitlisted and confirmed are different outcomes with different consequences, so reporting only 'joined' leaves the participant believing they have a place they may not have.",
    expectedUiState:
      "The result names the entry's status, and a waitlisted entry says why. A bare success message is the finding.",
    endResult: "One entry exists for this account.",
  },
  "checklist-content-discovery-event-participation-own-entry-visible-after-join": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Join an active event.",
      "Return to the event page and look for the participant's own entry.",
      "Read its status there.",
      "Check the page shows the participant is already in rather than offering to join again.",
      "Look for the entry anywhere else the buyer's own account lists it.",
    ],
    expectedBehaviour:
      "A participant can see their own entry without asking anyone. An entry that exists only on an admin screen is a record about somebody that they cannot read — and the join control still offering itself is what makes them try again.",
    expectedUiState:
      "The event page shows the participant's own entry with its status, and the join control reflects that they are already in.",
    endResult: "The entry is visible to its owner.",
  },
  "checklist-content-discovery-event-participation-entry-survives-reload-and-relogin": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Join an active event and note the entry's status.",
      "Reload the event page and read the entry again.",
      "Sign out and sign back in as the same account.",
      "Open the event page and read the entry.",
      "Open the event in a different browser signed in as the same account.",
    ],
    expectedBehaviour:
      "The entry is a stored record keyed to the account, so it survives a reload, a sign-out and a different device. An entry held only in the browser disappears the moment the participant switches devices, which is exactly when they check whether they got in.",
    expectedUiState:
      "The entry and its status are present after the reload, after signing back in, and in the second browser.",
    endResult: "The entry persists.",
  },
  "checklist-content-discovery-event-participation-cannot-join-twice": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Join an active event.",
      "Attempt to join the same event again from the page.",
      "Read what happens.",
      "Open the event in a second tab and attempt to join from there as well.",
      "Check the account has exactly one entry.",
    ],
    expectedBehaviour:
      "A second join is refused rather than creating a duplicate. Two entries for one account inflate the entry count, double the account's odds in any draw, and are indistinguishable from two different people once the names are masked.",
    expectedUiState:
      "The second attempt is refused with a message saying the account is already entered, and only one entry exists. Two entries is the finding.",
    expectedData: { entriesForAccount: 1 },
    endResult: "Exactly one entry exists.",
  },
  "checklist-content-discovery-event-participation-leave-or-cancel-entry": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Join an active event.",
      "Find the control for withdrawing and use it.",
      "Read the confirmation, if one is shown.",
      "Read the entry's state afterwards.",
      "Reload and read it again.",
      "Check the event's entry count fell.",
    ],
    expectedBehaviour:
      "Withdrawing is possible and is reflected in both the entry and the event's counts. An entry that cannot be withdrawn leaves a participant permanently counted in something they left — and if the counts do not follow, a waitlisted person is never promoted into the freed place.",
    expectedUiState:
      "The entry reads as cancelled or is gone, the state survives a reload, and the event's entry count is one lower.",
    endResult: "The entry is withdrawn.",
  },
  "checklist-content-discovery-event-participation-closed-event-cannot-be-joined": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Open /events and find an event whose status is ended.",
      "Open it and read whether a join control is offered.",
      "If one is offered, use it and read what happens.",
      "Repeat with an event whose status is cancelled.",
      "Repeat with one whose status is paused.",
    ],
    expectedBehaviour:
      "An event that cannot be joined says so on the page rather than accepting a click and failing at submit. The status set includes paused and cancelled alongside ended, and each has to be handled — a page that only knows about ended lets the other two through.",
    expectedUiState:
      "None of the three offers a working join control, and each states its own status. A control that fails only on submit is the finding, named by status.",
    endResult: "No entry is created.",
  },
  "checklist-content-discovery-event-participation-leaderboard-shows-real-participants": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Open an event that has a leaderboard and open that tab.",
      "Read the rows — the names and the scores.",
      "Check the names are masked rather than showing full identities.",
      "Check the scores are real numbers rather than zeros or placeholders.",
      "Cross-check one row against the event's entry list if it is visible.",
    ],
    expectedBehaviour:
      "The leaderboard lists real entrants with real scores, and their names are masked. A masking helper that only copies its input instead of masking is invisible everywhere except to a human who recognises a real name — one shipped in exactly that shape and sat, because the field it should have masked was not being displayed at all.",
    expectedUiState:
      "Real participants with real scores, each name partially hidden. A full name is a finding and a leak; all-zero scores is a separate finding.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-event-participation-leaderboard-own-row-findable": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Join an event that has a leaderboard and take part enough to appear on it.",
      "Open the leaderboard.",
      "Look for the participant's own row without scrolling the whole list.",
      "Check it is highlighted, pinned, or otherwise findable.",
      "Read the position shown for it.",
    ],
    expectedBehaviour:
      "A participant can find themselves. A leaderboard is read almost entirely to answer one question — where am I — and on a long list without a marker that answer requires scrolling past everyone else.",
    expectedUiState:
      "The participant's own row is marked or surfaced, with their position. Having to scroll a long list to find it is the finding.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-event-participation-leaderboard-ordering-correct": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Open an event leaderboard and write down the first ten rows in order with their scores.",
      "Check each score is not greater than the one above it.",
      "Find two rows with equal scores and note their order.",
      "Reload the page and read the first ten again.",
      "Check the order is identical, including the tied pair.",
    ],
    expectedBehaviour:
      "The ordering is by score and is stable across reloads, ties included. An unstable tie break swaps positions between two visits — so a participant sees themselves at rank 6 and then rank 7 with nothing having changed, which reads as the site losing their score.",
    expectedUiState:
      "Scores are non-increasing down the list, and the whole order including the tied pair is identical after the reload.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-event-participation-leaderboard-empty-state": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Open /events and find an event with no entries yet, such as a draft or a newly-started one.",
      "Open its leaderboard.",
      "Read what is shown.",
      "Check it states there are no entries rather than showing a blank panel.",
      "Check whatever chrome the leaderboard has — headings, columns — either renders sensibly or is omitted.",
    ],
    expectedBehaviour:
      "An empty leaderboard says it is empty. A blank panel is indistinguishable from a leaderboard that failed to load, and the participant's reasonable conclusion is that their entry was lost.",
    expectedUiState:
      "An explicit empty state. A blank area, or column headings over nothing, are both findings.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-event-participation-raffle-winner-announced-to-participants": {
    roles: ["admin", "buyer"],
    startPage: "/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open an event with a raffle configured.",
      "Draw the raffle and note who won.",
      "Sign in as the winning participant.",
      "Open the event page and read whether the result is announced.",
      "Open the account's notifications and look for one about the win.",
      "Sign in as a non-winning participant and check the result is visible to them too.",
    ],
    expectedBehaviour:
      "A drawn raffle is announced on the event page and the winner is notified. A result that exists only in the admin screen means the winner never learns they won — and the notification's link has to land somewhere real, which for entries means the list rather than a fabricated per-entry page that would 404.",
    expectedUiState:
      "The event page names the winner, the winner has a notification, and other participants can see the result. A win visible only to an admin is the finding.",
    endResult: "One raffle is drawn.",
  },
  "checklist-content-discovery-event-participation-spin-wheel-one-use-enforced": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      SIGN_IN_BUYER,
      "Open /events and find a spin-wheel event that is currently open.",
      "Take a spin and read the result.",
      "Attempt to spin again immediately.",
      "Read what happens.",
      "Reload the page and attempt once more.",
      "If a prize was won, follow whatever the interface offers for claiming it.",
    ],
    expectedBehaviour:
      "The per-user spin limit is enforced server-side and survives a reload, and a won prize is claimable. A limit held only in the browser is defeated by refreshing — which is the first thing anyone does after a disappointing spin.",
    expectedUiState:
      "The second spin is refused before and after the reload, with a message naming the limit, and a won prize can actually be claimed. A spin that works again after a reload is the finding.",
    endResult: "One spin is used; claim the prize if one was won.",
  },
};
