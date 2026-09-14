/*
 * WHY: Three `admin/bug-hunter-rewards` cases need a tester submission that
 *      ALREADY EXISTS before the tester arrives — you cannot test "confirm this
 *      reported bug" or "reopen this confirmed case" against an empty inbox.
 *
 *      `testerChecklistResponses` is DERIVED tier, so a run wipes it at setup
 *      and on a fresh project there are genuinely zero submissions. That is
 *      correct — stale verdicts from a previous run must not leak into the next
 *      one — but it left those three cases permanently unrunnable. Measured
 *      2026-09-11: 0 pass / 0 fail / 5 blocked on that page, with both
 *      calibration controls answered correctly, so the batch was trustworthy and
 *      the emptiness was real.
 *
 *      The fix is NOT to stop wiping the collection. It is to restore these
 *      fixtures after the wipe — `SEED_TRANSACTIONAL` in
 *      tester/scripts/lib/collections.mjs is a RESTORE list, orthogonal to the
 *      delete tiers, so a collection can be both wiped and re-seeded.
 *
 * WHAT: Two response documents against the two demo-fixture checklist items that
 *       already live in the catalogue.
 *
 * 🛑 THE DOC ID IS DETERMINISTIC: `${testerId}__${checklistItemId}`.
 *    That is the same id the live answer path computes, and it is what makes an
 *    answer an UPSERT rather than a duplicate — `set({merge:true})`, never
 *    `add()`. Generating a random id here would (a) create a second, competing
 *    response for the same (tester, case) pair the moment a real tester answers,
 *    and (b) break idempotency, so every `appkit-seed load` would pile up
 *    another copy — Root Cause #25 exactly.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag access:server-only
 * @tag consumers:appkit/scripts/seed-cli.mjs, seed/manifest.ts
 * @tag sideEffects:none
 */

import type { TesterChecklistResponseDocument } from "../schemas/firestore";

/** The seeded buyer the demo fixtures credit as "Mock User 3". */
const TESTER_ID = "user-yugi-muto";
const TESTER_NAME = "Mock User 3";

/** Same shape the answer route computes — see the callout above. */
const responseId = (testerId: string, checklistItemId: string) =>
  `${testerId}__${checklistItemId}`;

const DEMO_V1 = "checklist-admin-bug-hunter-rewards-demo-fixture";
const DEMO_V2 = "checklist-admin-bug-hunter-rewards-demo-fixture-v2";

const seededAt = new Date("2026-08-18T09:30:00.000Z");

export const testerResponsesSeedData: Partial<TesterChecklistResponseDocument>[] = [
  /*
   * The ALREADY-CONFIRMED submission. The v1 catalogue item carries
   * bugConfirmed:true / bugHunterId:"user-yugi-muto" / bugHunterName:"Mock User
   * 3", and until now there was no response row behind that credit — so
   * /admin/tester-feedback showed "No feedback submitted yet" while the
   * leaderboard showed a confirmed bug. This is the missing half.
   *
   * Backs: confirm-bug-idempotent (needs a row that is already confirmed) and
   * reopen-case (needs the v1 credit to be visible from a real submission).
   *
   * `status: "reviewed"` because an admin has already acted on it.
   */
  {
    id: responseId(TESTER_ID, DEMO_V1),
    testerId: TESTER_ID,
    testerDisplayName: TESTER_NAME,
    checklistItemId: DEMO_V1,
    groupKey: "admin",
    pageKey: "bug-hunter-rewards",
    phase: 1,
    answer: "no",
    comment:
      "Seed fixture — the reported bug behind the v1 demo case. Already confirmed and credited, then reopened as v2. Exists so an admin can see what a confirmed submission looks like without waiting for a real tester to file one.",
    status: "reviewed",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  /*
   * The UNCONFIRMED submission, against the active v2 retest. This is the row
   * "Mark as Bug" is meant to be tried on end-to-end.
   *
   * 🛑 status MUST stay "new" and the case MUST stay un-confirmed, or the
   * confirm-bug case has nothing left to do — it would open an already-confirmed
   * row and correctly report that it could not perform its own steps. A fixture
   * that pre-completes the thing under test is worse than no fixture, because it
   * looks like coverage.
   */
  {
    id: responseId(TESTER_ID, DEMO_V2),
    testerId: TESTER_ID,
    testerDisplayName: TESTER_NAME,
    checklistItemId: DEMO_V2,
    groupKey: "admin",
    pageKey: "bug-hunter-rewards",
    phase: 1,
    answer: "no",
    comment:
      "Seed fixture — a fresh 'No' on the reopened v2 case, deliberately NOT yet confirmed. This is the row to try Mark as Bug against.",
    status: "new",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
];
