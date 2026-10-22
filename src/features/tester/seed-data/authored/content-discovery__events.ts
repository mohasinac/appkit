/*
 * WHY: Authored six-part procedures for the content-discovery/events page.
 * WHAT: 19 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 EVENTS ARE GLOBAL — the document carries no storeId, no categorySlugs and no
 * brandSlug — which is why their facet counts are unscoped and why no case here
 * filters an event by store. Time-bound event fixtures derive their windows from
 * tester-window.ts, so a run can shorten them and actually watch one close.
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
  "checklist-content-discovery-events-event-pinned-first": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open /events in a private window with no session.",
      "Read the FIRST card in the list and note its title.",
      "Read every card's start date. The list's normal order is soonest start date first.",
      "WAIT for the page to settle for a few seconds — the list refetches from /api/events after first paint — then read the first card AGAIN.",
      "Open the homepage and read the first card in the Events & Offers strip.",
    ],
    expectedBehaviour:
      "event-festive-cashback-10 (\"Diwali to New Year: Four Offers, Three Months\") is seeded isPinned, so it comes first on /events and in the homepage strip regardless of whether its start date is the soonest. Pinning is applied in memory by sortPinnedFirst rather than by a Firestore orderBy — ordering on a field that every other event lacks would return only the pinned row and empty the page, which is the failure to look for here: a one-card events list is NOT a successful pin.",
    expectedUiState:
      "The pinned event is the first card both before and after the refetch, and first in the homepage strip. Every other active event is still listed below it — if the other events disappear, the ordering was pushed into the query. If the pinned event is first on load and drops to its date position a few seconds later, the API route is not applying the same ordering the server render did.",
    expectedData: { firstSlug: "festive-cashback-10" },
    endResult: "Nothing changed — this case only reads.",
  },
  "checklist-content-discovery-events-view-event": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open /events in a private window with no session.",
      "Click event-favourite-blader-poll.",
      "Read the title, dates, status and description.",
      "Read the tab bar and open each tab in turn.",
      "Read the address bar as each tab opens.",
    ],
    inputs: { eventId: "event-favourite-blader-poll" },
    expectedBehaviour:
      "An event detail page is split into routed child tabs — Overview, Participate and Leaderboard — so each is a real URL rather than local state. The description renders as HTML, which is where an event's extra images live since the document has no gallery field.",
    expectedUiState:
      "Title, dates and status render. Each tab changes the URL and renders its own content. The description shows formatted prose and any inline images, not raw markup as visible text.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-events-events-listing-cards-images": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open /events in a private window with no session.",
      "Look at every card's image.",
      "Hard-reload with Ctrl+Shift+R and look again.",
      "Read every status filter offered and select each in turn.",
      "Read the results for each status.",
    ],
    expectedBehaviour:
      "Every card renders its image, and every status chip corresponds to a real stored status. The seed carries a paused and a cancelled event specifically because those two chips previously had no rows at all and could never return anything.",
    expectedUiState:
      "All cards show images on both loads, with no broken glyph or grey placeholder. Every status chip returns rows or a named empty state, and the paused and cancelled chips both return their fixtures.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-events-lottery-cover-image": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open /events in a private window and find event-pokemon-number-draw-july-2026.",
      "Look at its card image.",
      "Open /lottery/event-pokemon-number-draw-july-2026 — the lottery detail route is /lottery/{id}, not /events/{id}.",
      "Look at the image at the top of that page.",
      "Note whether either shows an emoji instead of a photograph.",
    ],
    inputs: { eventId: "event-pokemon-number-draw-july-2026" },
    expectedBehaviour:
      "A lottery renders its stored cover image on both the card and the detail page. The 🎰 emoji is the fallback for an event with no image, and seeing it where one is set means the field is not reaching the renderer.",
    expectedUiState:
      "Both the card and the detail hero show the cover photograph. Neither shows the 🎰 emoji placeholder.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-events-lottery-prize-previews": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open event-pokemon-number-draw-july-2026's detail page in a private window.",
      "Find the 'Prizes' collage above the numbered slot grid.",
      "Count the tiles in the collage.",
      "Count the slots in the numbered grid below it.",
      "Compare the two numbers and read whether any collage tile is blank.",
      "Read the page source for a slot price or weight value.",
    ],
    expectedBehaviour:
      "Only slots carrying an image appear in the collage — a slot without one is omitted rather than rendered as an empty tile, so a 200-slot lottery with six photographed prizes shows six tiles. The client-facing slot shape is an allow-list: number, name, booked state and image reach the browser, price and weight never do.",
    expectedUiState:
      "The collage holds one tile per photographed prize and no blank tiles. The numbered grid below still shows EVERY slot, photographed or not. No slot price or weight appears anywhere in the page or its source.",
    expectedData: { blankCollageTiles: 0 },
    endResult:
      "Read-only; nothing persists. A collage with as many tiles as the grid has slots means unphotographed slots are being rendered as empties.",
  },
  "checklist-content-discovery-events-related-events-section": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open /events in a private window and open any active event.",
      "Stay on the Overview tab and scroll to the 'Related Events' carousel.",
      "Read the cards and their titles.",
      "Check whether the event currently open appears among them.",
      "Click one card and confirm it opens that event.",
    ],
    expectedBehaviour:
      "Related events are other ACTIVE events sharing at least one tag, with the current event excluded. Ended and cancelled events must not be suggested — a suggestion the visitor cannot act on is worse than no carousel.",
    expectedUiState:
      "The carousel holds real event cards with titles and images. The current event is not among them. No card is an ended or cancelled event. An empty rail beneath a heading is a fail — the section should not render at all.",
    expectedData: { selfLinkCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-events-poll-vote-inline": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open event-favourite-blader-poll and click the Participate tab.",
      "Read the options offered.",
      "Select the first option and submit the vote.",
      "Read what the page shows immediately afterwards, without reloading.",
      "Reload the page and read the Participate tab again.",
      "Try to vote a second time.",
    ],
    inputs: { eventId: "event-favourite-blader-poll" },
    expectedBehaviour:
      "A vote is recorded as an entry against this user and the tally updates in place. One vote per user is enforced server-side, so a second attempt is refused rather than silently counted again.",
    expectedUiState:
      "The vote registers without a full page reload and the tally moves. After reloading, the same option is still shown as this user's choice. The second attempt is refused with a message rather than accepted.",
    expectedData: { votesPerUser: 1 },
    endResult: "The vote survives the reload.",
  },
  "checklist-content-discovery-events-poll-leaderboard-shows-tally": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open event-favourite-blader-poll in a private window.",
      "Click the Leaderboard tab.",
      "Read every row — what it names and what number it carries.",
      "Check whether the rows are option labels or people's names.",
      "Check whether the counts descend down the list.",
    ],
    expectedBehaviour:
      "A poll's leaderboard ranks OPTIONS by votes, not participants by who voted first. Reusing the generic entries-ranked-by-time view produces a list of voters, which answers a question nobody asked and publishes who voted.",
    expectedUiState:
      "Each row names a poll option with its vote count or percentage, ordered highest first. No row names a person. A list of voter names is the failure even when it renders neatly.",
    expectedData: { rowsAreOptions: true },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-events-admin-event-entries-export": {
    roles: ["admin"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events and open the entries page for event-favourite-blader-poll.",
      "Read the entries listed and expand one to read its response inline.",
      "Click 'Download Report'.",
      "Open the downloaded file and read it.",
      "Compare the entries in the file against the ones shown on screen.",
    ],
    expectedBehaviour:
      "Responses are readable inline, without downloading anything, and the download is a Markdown report of all entries. Both are needed: acting on an entry you cannot read is the dead-end shape this whole page family exists to close.",
    expectedUiState:
      "Each entry can be expanded to show its response. 'Download Report' produces a Markdown file listing every entry with its response. The file's entries match what the page shows rather than being a shorter or differently-filtered set.",
    endResult:
      "A report file exists on disk. Read-only against the data; nothing in the app changes.",
  },
  "checklist-content-discovery-events-survey-feedback-submit": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open event-metal-fight-era-feedback and click the Participate tab.",
      "Submit the form with every field empty and read where the errors appear.",
      "Type 'QA Feedback survey-feedback-submit' into the free-text field and answer any other required fields.",
      "Submit the form.",
      "Reload the page and read the Participate tab.",
    ],
    inputs: { response: "QA Feedback survey-feedback-submit" },
    expectedBehaviour:
      "The form validates against its schema and reports each problem on the field that caused it, then records an entry against this user.",
    expectedUiState:
      "The empty submit marks individual fields rather than showing one banner. The filled submit produces a confirmation. After reloading, the tab shows the response as already submitted rather than offering a blank form again.",
    endResult: "The entry survives the reload.",
  },
  "checklist-content-discovery-events-offer-coupon-display-copy": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open event-buy-3-get-1-beyblades and read the coupon code displayed.",
      "Click the copy control beside it.",
      "Read any confirmation shown.",
      "Open /checkout with an item in the cart and paste into the coupon field.",
      "Read what was pasted and click 'Apply'.",
    ],
    inputs: { eventId: "event-buy-3-get-1-beyblades" },
    expectedBehaviour:
      "The code is shown in full and the copy control puts exactly that string on the clipboard. A copy control that copies a truncated or differently-cased value produces a rejection the buyer cannot explain.",
    expectedUiState:
      "The code is legible in full on the page. Copying shows a confirmation. The pasted value matches the displayed code character for character, and applying it is accepted.",
    endResult:
      "Remove the coupon afterwards so later checkout cases start from an empty coupon list.",
  },
  "checklist-content-discovery-events-raffle-entry": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open event-win-burst-regalia-genesis and click the Participate tab.",
      "Read the entry conditions stated.",
      "Enter the raffle.",
      "Read what the page shows immediately, without reloading.",
      "RELOAD and read the tab again BEFORE touching the form — note whether it already shows you as entered, or presents an empty form as though you had not.",
      "Try to enter a second time.",
    ],
    /*
     * 🛑 The fixture changed, 2026-10-19 — it pointed at
     * `event-won-original-set-raffle`, which is seeded `status: ENDED` with a
     * winner ALREADY DRAWN. `enterEvent` refuses any event that is not active,
     * so every step after "Enter the raffle" was unreachable: the case could
     * only ever record the generic closed-entries refusal, which looks like a
     * correct result and proves nothing about one-entry-per-user.
     * `event-win-burst-regalia-genesis` is the active open_raffle.
     */
    inputs: { eventId: "event-win-burst-regalia-genesis" },
    expectedBehaviour:
      "An open raffle records one entry per user, enforced SERVER-side. The entry is what makes the user eligible for the draw, so a duplicate would literally double their odds against everyone else. A limit held in the browser is no limit: the form's counter starts at zero on every page load.",
    expectedUiState:
      "The entry is confirmed in place. After reloading — before any interaction — the tab already shows the user as entered, not an inviting empty form. The second attempt is refused with a message naming the existing entry.",
    expectedData: { entriesPerUser: 1, entriesAfterSecondAttempt: 1 },
    endResult:
      "BEFORE: a reload reset the form's counter to zero and presented an empty form, and submitting it was ACCEPTED with the same 'You're entered in the raffle!' toast — two entries for one person, because only surveys and polls had a per-user check and raffle had none. AFTER: the reloaded page shows the entry, and a forced second submit is refused. Exactly one entry exists.",
  },
  /*
   * 🛑 THESE TWO CASES CHANGED SHAPE, 2026-09-15.
   *
   * They used to open one fixture per raffleType — a `top_n_scorers` event and a
   * `top_n_participants` one — and compare their leaderboards side by side. Both
   * fixtures are gone and the permanent seed carries only `open_raffle`, so the
   * comparison has no second half to make.
   *
   * Rather than delete the coverage, each case now AUTHORS the raffle type it is
   * about, on a real event, and then reads the leaderboard back. That is a
   * stronger test than the old one — it exercises the admin write path as well as
   * the render — and it is the only form the current seed can express.
   */
  "checklist-content-discovery-events-raffle-entry-top-n-scorers": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events, open event-win-burst-regalia-genesis for editing, and write down its current raffle type.",
      "Set the raffle type to 'Top N scorers', set the N to 3, and save.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /events/event-win-burst-regalia-genesis and read the Overview tab's description of how winners are chosen.",
      "Click the Participate tab and enter.",
      "Click the Leaderboard tab and read how entries are ranked.",
      "Read whether the ranking is by score and whether the eligible cut-off of 3 is stated.",
      "Sign back in as admin@letitrip.in and restore the raffle type written down in step 2.",
    ],
    inputs: { eventId: "event-win-burst-regalia-genesis", raffleTopN: 3 },
    expectedBehaviour:
      "A top-N-scorers raffle draws from the highest-scoring entries, so the leaderboard must rank by score and the page must say how many qualify. Ranking by entry time instead would silently change who can win. The saved raffle type must also reach the public page — an admin field that saves and never renders is the commonest shape of this bug.",
    expectedUiState:
      "The Overview tab names the top-3-by-score rule after the save. The leaderboard is ordered by score, highest first, and the cut-off is stated. Entering is confirmed. A leaderboard still ordered by entry time is the failure.",
    endResult: "The entry survives a reload. The raffle type is restored by the final step.",
  },
  "checklist-content-discovery-events-raffle-entry-top-n-participants": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events, open event-win-burst-regalia-genesis for editing, and write down its current raffle type.",
      "Set the raffle type to 'Top N earliest participants' — the dropdown carries the word 'earliest' and the stored value is top_n_participants — set the N to 3, and save.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /events/event-win-burst-regalia-genesis and read the Overview tab's description of how winners are chosen.",
      "Click the Participate tab and enter.",
      "Click the Leaderboard tab and read how entries are ranked.",
      "Compare the stated rule with the top-N-scorers rule from the previous case.",
      "Sign back in as admin@letitrip.in and restore the raffle type written down in step 2.",
    ],
    inputs: { eventId: "event-win-burst-regalia-genesis", raffleTopN: 3 },
    expectedBehaviour:
      "A top-N-participants raffle draws from the earliest or most active participants rather than the highest scorers — a different rule from the scorers variant. Running both against the same event is what makes the difference checkable now that there is no fixture per type.",
    expectedUiState:
      "The Overview tab names a participation rule, not a score rule, and the leaderboard is ordered accordingly. Wording identical to the previous case means the raffle type is not reaching the leaderboard.",
    endResult: "The entry survives a reload. The raffle type is restored by the final step.",
  },
  "checklist-content-discovery-events-spin-wheel": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Navigate to the wheel BY CLICKING its card from /events — do not type the URL. The link uses the event's slug, which is the path a real visitor takes.",
      "Click the Participate tab.",
      "Click the spin control ONCE and watch the wheel.",
      "Read the prize shown and how long it took to appear.",
      "If anything is refused, open the network panel and record the spin request's STATUS CODE and the `code` field in its response body.",
      "Reload the page and read the Participate tab.",
    ],
    inputs: { eventId: "event-daily-beyblade-pull-wheel" },
    expectedBehaviour:
      "The very first spin succeeds and names a prize. The spin is a plain POST to /api/events/{id}/spin and its response carries the prize — there is no realtime channel involved, so a failure is the request itself failing, not a subscription timing problem.",
    expectedUiState:
      "The wheel spins and lands on a named prize within a few seconds. No 'Spin failed' error appears on the first attempt. After reloading, the result is still shown rather than the wheel offering another free spin.",
    expectedData: { spinsUsed: 1, spinHttpStatus: 200 },
    /*
     * 🛑 Two recorded production failures, and the SLUG step above is what
     * reaches the second one.
     *
     * The feature was gated on `FEATURE_PRIZE_DRAWS`, an env var belonging to a
     * mechanism that had already been retired and was therefore set nowhere —
     * so every spin returned 503 while the button rendered enabled. Underneath
     * that, the spin core looked the event up by document id only, with no slug
     * fallback, while every card links by slug. Fixing the gate alone turns the
     * 503 into a 404.
     *
     * So "type the doc-id URL and spin" would have passed against the live bug.
     * Arriving by click is the test.
     */
    endResult:
      "BEFORE: the spin returned HTTP 503 with code `feature_disabled` on every attempt (and, once that was fixed, HTTP 404 `EVENT_NOT_FOUND` whenever the page was reached by its slug — i.e. from any card). Both rendered as 'Spin failed. Please try again.'. AFTER: the first click returns 200 and names a prize. The recorded spin and its prize survive the reload.",
  },
  "checklist-content-discovery-events-spin-wheel-max-per-user": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open event-daily-beyblade-pull-wheel and read the stated maximum spins per user.",
      "Spin until that maximum is reached, reading the remaining count each time.",
      "Attempt one more spin.",
      "Read the refusal.",
      "Reload the page and attempt another spin.",
    ],
    expectedBehaviour:
      "The per-user spin cap is enforced server-side, so reloading does not restore a spin. A cap held only in the browser resets on refresh and the limit is no limit at all.",
    expectedUiState:
      "The remaining count decreases with each spin. At zero the control is refused with a message naming the limit. After reloading it is still refused — a fresh spin available after a reload is the failure.",
    expectedData: { spinsAfterReload: 0 },
    endResult: "The exhausted state persists across reloads.",
  },
  /*
   * 🛑 THE CLOSED WINDOW IS NOW AUTHORED, NOT WAITED FOR, 2026-09-15.
   *
   * This used to sit on a fixture whose spin window was a fraction of the run's
   * testing window, so a tester could watch it close. That fixture is gone, and
   * the permanent seed's wheel is open for another three weeks — a duration no
   * session can outlast. Narrowing the window from the admin editor reaches the
   * same refusal in a few seconds, and restoring it is one field.
   */
  "checklist-content-discovery-events-spin-wheel-window-blocked": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events, open event-daily-beyblade-pull-wheel for editing, and write down its current spin window start and end.",
      "Set the spin window end to yesterday's date so the window is closed, and save.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /events/event-daily-beyblade-pull-wheel, read the stated spin window, and attempt a spin.",
      "Read the refusal and check it names the window rather than a generic failure.",
      "Sign back in as admin@letitrip.in and restore the two dates written down in step 2.",
    ],
    inputs: { eventId: "event-daily-beyblade-pull-wheel" },
    expectedBehaviour:
      "Spins outside the configured window are refused with a reason naming the window, and the check runs server-side — a window enforced only by hiding the button is no window at all.",
    expectedUiState:
      "With the window closed the spin control is refused and the message names the window or its times. It is not a generic 'Spin failed', which would be indistinguishable from the realtime failure above.",
    endResult:
      "No spin is recorded outside the window. The original window is restored by the final step; if the restore fails, say so rather than leaving the wheel closed for later cases.",
  },
  "checklist-content-discovery-events-spin-results-tab": {
    roles: ["guest"],
    startPage: "/events",
    steps: [
      "Open event-daily-beyblade-pull-wheel in a private window with no session.",
      "Find the 'Last 10 Spin Results' tab and open it.",
      "Read every row — the name shown and the prize.",
      "Count the rows.",
      "Check whether any row shows a full real name.",
    ],
    expectedBehaviour:
      "The results tab lists recent winners, capped at ten, with anonymous spins shown as 'Guest'. Named entries are shown masked — a public results list is exactly the surface where an unmasked display name leaks, and a masking helper that returns its input unchanged looks correct from every layer except this one.",
    expectedUiState:
      "At most ten rows, each naming a prize. Anonymous spins read 'Guest'. Named entries are masked rather than showing a full real name.",
    expectedData: { maxRows: 10 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-events-event-guest-participation-toggle": {
    roles: ["admin", "guest"],
    startPage: "/admin/events",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events/new and create an event titled 'QA Event guest-participation' with guest participation ENABLED, starting today and ending in a week.",
      "Open its public page in a private window with no session.",
      "Enter the event as a guest and read the confirmation.",
      "Attempt to enter a second time from the same private window.",
      "Read the refusal.",
      "As admin, edit the event to disable guest participation and save.",
      "Reload the public page in the private window and attempt to enter.",
    ],
    inputs: { eventTitle: "QA Event guest-participation", guestParticipation: true },
    expectedBehaviour:
      "With guest participation enabled an anonymous visitor may enter once per device, and a second attempt from the same device is blocked. With it disabled the entry control asks for sign-in instead of accepting anonymous entries.",
    expectedUiState:
      "The first guest entry is confirmed. The second is refused with a message rather than silently accepted. After the toggle is disabled, the public page prompts for sign-in rather than offering entry.",
    expectedData: { guestEntriesPerDevice: 1 },
    endResult:
      "Delete the event afterwards so it does not accumulate across runs.",
  },
  "checklist-content-discovery-events-leaderboard-live-refresh": {
    roles: ["buyer"],
    startPage: "/events",
    steps: [
      "In window A, open event-favourite-blader-poll's Leaderboard tab signed out, and read the tallies.",
      "Leave window A on that tab without reloading it.",
      "In window B, sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "In window B, open the same event's Participate tab and vote for an option.",
      "Return to window A and watch the tallies for up to 15 seconds without reloading.",
    ],
    expectedBehaviour:
      "The leaderboard updates from the live feed rather than only on load, so a viewer watching a poll sees it move. A tally that only changes on refresh makes a live event feel dead.",
    expectedUiState:
      "Window A's tally for the voted option increases within about 15 seconds, with no reload and no interaction. A figure that only changes when the tester refreshes is the failure.",
    endResult:
      "The vote persists. This requires vivaan.kapoor@gmail.com not to have voted on this poll already — if they have, use another buyer persona.",
  },
};
