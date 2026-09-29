/*
 * WHY: Authored six-part procedures for the addresses/unban-request page.
 * WHAT: 1 case, keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

/*
 * Verified against the drawer on 2026-09-29, and every assertion the case
 * makes is correct: the trigger reads 'Request Unban' and renders only when
 * the address is banned; the drawer's field is 'Reason for unban request';
 * its submit is 'Submit request' and is DELIBERATELY not disabled on an empty
 * note, with a source comment saying why; and addressUnbanRequestSchema
 * carries a .min(20) whose message is
 *
 *   'Explain what happened — at least 20 characters. This is all the reviewer sees.'
 *
 * So the 20 the case names is real, and so is the error text.
 *
 * 🛑 WHAT IS MISSING IS THE PRECONDITION. This buyer has no addresses at all,
 * and no seeded address is banned, so 'find an address showing a banned state'
 * finds nothing. Worse, there is no UI path to ban one: ban-address is a row
 * action on the Banned Addresses queue, which is fed only by
 * GET /api/admin/addresses?banStatus=..., and its chips are banned,
 * unban_requested and suspicious. The All chip sends no banStatus and the
 * route then returns an empty list — so that queue can only act on rows
 * already in it, and nothing in the product puts a clean address there.
 *
 * The one real producer is hardBanCascade, which bans every address belonging
 * to a hard-banned user. But /unban reverses exactly that via
 * unbanAutoForOwner, so lifting the user's ban clears the address too. The two
 * states this case needs together — an ACTIVE buyer with a BANNED address —
 * cannot be reached from the UI at all.
 *
 * So the case attempts the setup, RECORDS the gap, and runs the real
 * assertions only if a banned address does exist. Recorded in OUTOFSCOPE.
*/

export const authored: Record<string, AuthoredCase> = {
  "checklist-addresses-unban-request-empty-note-says-why": {
    roles: ["buyer"],
    startPage: "/user/addresses",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open the Banned Addresses queue.",
      "Select the All chip and read how many rows are listed, then try the Banned, Unban Requested and Suspicious chips in turn.",
      "Record whether ANY route in the product lets an admin ban a single address on an otherwise-active account — if none does, this case cannot be set up, and that is the finding.",
      "If a banned address belonging to rehan.sheikh@gmail.com does exist, continue. Otherwise stop here and answer no, quoting what each chip returned.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and open /user/addresses.",
      "Find the banned address and click 'Request Unban'.",
      "Leave 'Reason for unban request' completely empty and click 'Submit request'. The button must be clickable, not greyed out.",
      "Read where the message appears.",
      "Type 'Too short' and click 'Submit request' again.",
      "Type 'This address was banned in error; it is my registered home address.' and submit.",
    ],
    inputs: {
      shortNote: "Too short",
      validNote: "This address was banned in error; it is my registered home address.",
      minimumLength: 20,
      trigger: "Request Unban",
      field: "Reason for unban request",
      submit: "Submit request",
    },
    expectedBehaviour:
      "Submitting with an empty or too-short note fails loudly ON THE FIELD and names the 20-character minimum. The note is the entire case a reviewer reads, so a request without one is not a request — but a greyed-out button with a bare return in its handler tells the user nothing about why, which is what this replaced.",
    expectedUiState:
      "The submit button is enabled even with the box empty. Pressing it puts an error on the note field naming the minimum length; the schema message reads 'Explain what happened — at least 20 characters. This is all the reviewer sees.' 'Too short' produces the same error. The full sentence is accepted and a confirmation appears.\n\n🛑 If no banned address exists, answer NO for the precondition rather than null: there is no UI path to ban one, which is a product gap and not a missing test channel.",
    expectedData: { minimumNoteLength: 20, submitEnabledWhenEmpty: true },
    endResult:
      "If the request was submitted, the address reads as unban-requested and carries the full note. A silently disabled button that does nothing when pressed is the failure — the user cannot tell it from a broken page.",
    needsReview: true,
    reviewNote:
      "The assertions are verified correct against the drawer and its schema. What is unsettled is whether an admin should be able to ban a single address on an otherwise-active account at all; today they cannot, so this case has no reachable setup.",
  },
};
