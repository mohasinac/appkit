/*
 * WHY: Authored six-part procedures for the admin/bug-hunter-rewards page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * 🛑 THE LAST UNAUTHORED PAGE IN THE CATALOGUE. It was the sole remaining entry in
 * R5's `UNAUTHORED_PAGES` ratchet (audit-tester-plugin-wiring.mjs), whose own
 * header says the ratchet exists to be emptied. With this file it is.
 *
 * This page is awkward to test for a reason worth stating: confirming a bug
 * DISABLES the case it was reported against, and credit is awarded to exactly one
 * tester. Both effects are visible to every other tester, and the credit cannot be
 * silently reassigned. So the cases below deliberately operate on the seeded demo
 * fixture pair (v1 disabled + credited, v2 active) rather than on a live report:
 *
 *   checklist-admin-bug-hunter-rewards-demo-fixture      v1, isActive:false,
 *                                                        bugConfirmed, credited to
 *                                                        "Mock User 18"
 *   checklist-admin-bug-hunter-rewards-demo-fixture-v2   v2, isActive:true
 *
 * That pair exists precisely so this flow can be read without spending a real
 * tester's report on it. Where a case must perform the irreversible half —
 * confirming a bug — it does so against v2, which is the fixture reopened for
 * exactly that purpose.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const SIGN_IN_ADMIN = "Sign in as admin@letitrip.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-admin-bug-hunter-rewards-confirm-bug": {
    roles: ["admin"],
    startPage: "/admin/tester-feedback",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/tester-feedback and select the Main Issues tab.",
      "Find the row for the case 'Demo fixture — reported bug, already confirmed and reopened (v2, active)' and read the tester name on it.",
      "Click 'Mark as Bug' on that row.",
      "Read the confirmation dialog in full before accepting, then accept it.",
      "Read the badge that appears on the row afterwards.",
      "Open /admin/tester-checklist, set the Status filter to 'All', and read the Status of that same case.",
    ],
    inputs: { caseId: "checklist-admin-bug-hunter-rewards-demo-fixture-v2" },
    expectedBehaviour:
      "Confirming a bug does two things at once and both are irreversible from this screen: it credits exactly one tester, and it takes the case out of circulation so no second tester can answer it. A confirmation dialog must stand in front of it — an accidental click here spends a credit on the wrong person and silently shrinks the catalogue.",
    expectedUiState:
      "A dialog appears BEFORE anything commits. After accepting, the row shows a confirmed-bug badge naming the crediting tester — the same name that was on the row beforehand, not a different one. In the catalog the case's Status reads as bug-confirmed rather than Active.",
    expectedData: { creditedTesterUnchanged: true },
    endResult:
      "Survives a reload: the badge and the credited name are still there, and the case is still out of the Active view.",
  },

  "checklist-admin-bug-hunter-rewards-confirm-bug-idempotent": {
    roles: ["admin"],
    startPage: "/admin/tester-feedback",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/tester-feedback and select the All Submissions tab.",
      "Find a row whose case is ALREADY bug-confirmed — the demo fixture 'reported bug, already confirmed and reopened (v1, disabled)' is credited to Mock User 18.",
      "Read the tester name currently credited on it.",
      "Attempt 'Mark as Bug' on that row.",
      "Read whatever the screen says in response.",
      "Read the credited tester name again and compare it against the one noted earlier.",
    ],
    inputs: { caseId: "checklist-admin-bug-hunter-rewards-demo-fixture", creditedTo: "Mock User 18" },
    expectedBehaviour:
      "A second confirmation on an already-confirmed case is REFUSED, and refused loudly. The failure mode this guards is silent re-crediting: two testers report the same case, an admin confirms twice, and the second confirmation quietly moves the credit off the person who actually found it. Nothing about that is visible unless the screen says so.",
    expectedUiState:
      "Either the action is absent/disabled on an already-confirmed row, or it is refused with a message naming the existing credit. What must NOT happen is a success message. The credited name is byte-identical to the one read at the start.",
    expectedData: { creditedTo: "Mock User 18" },
    endResult:
      "Reload the page: the credit still reads Mock User 18, and the case has not gained a second confirmation.",
  },

  "checklist-admin-bug-hunter-rewards-reopen-case": {
    roles: ["admin"],
    startPage: "/admin/tester-checklist",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/tester-checklist and set the Status filter to 'Inactive' (or set Bug status to 'Bug Confirmed').",
      "Find 'Demo fixture — reported bug, already confirmed and reopened (v1, disabled)' and read its Status and its bug-hunter credit.",
      "Use its 'Reopen as New Test Case' row action.",
      "Read the new case that appears — its label, its Status, and its version.",
      "Go back to the v1 case and read its Status and credit again.",
      "Open the Tester Hub as the tester and search for the new case.",
    ],
    inputs: { v1Id: "checklist-admin-bug-hunter-rewards-demo-fixture" },
    expectedBehaviour:
      "Reopening creates a NEW version rather than resurrecting the old one. The original must keep both its disabled state and its bug-hunter credit — that credit is a record of who found the defect, and a retest of the same behaviour does not undo the finding. Mutating v1 in place would erase the history the whole feature exists to keep.",
    expectedUiState:
      "Two rows exist afterwards: the old one still disabled and still credited, and a new active one answerable from the Tester Hub. The new case does NOT carry the old case's bug-hunter credit.",
    expectedData: { originalStaysDisabled: true, originalKeepsCredit: true },
    endResult:
      "Survives a reload: v1 disabled with its credit, the reopened version active and answerable.",
  },

  "checklist-admin-bug-hunter-rewards-catalog-default-active-filter": {
    roles: ["admin"],
    startPage: "/admin/tester-checklist",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/tester-checklist without touching any filter and read the total count shown.",
      "Search for 'Demo fixture — reported bug' and read how many rows match.",
      "Switch the Status filter to 'All' and read the total count and the matching rows again.",
      "Switch the Status filter to 'Inactive' and read which of the two demo fixtures appears.",
      "Set Status back to its default and set 'Bug status' to 'Bug Confirmed'.",
      "Read which rows appear under that filter.",
    ],
    inputs: { search: "Demo fixture — reported bug" },
    expectedBehaviour:
      "The default view is the answerable catalogue, not everything ever written. A bug-confirmed case is deliberately out of circulation, so showing it by default would invite an admin to treat a closed finding as open work. Switching the filter must reveal it — hidden is not the same as gone.",
    expectedUiState:
      "On the default view only the v2 (active) demo fixture matches the search. Under Status 'All' both appear and the total is higher. Under 'Inactive' the v1 disabled one appears. Under Bug status 'Bug Confirmed' the v1 one appears. The counts move in the direction the filter implies.",
    expectedData: { defaultViewHidesBugConfirmed: true },
    endResult: "Read-only — no case is modified.",
  },
};
