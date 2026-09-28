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
 *                                                        "Mock User 3"
 *   checklist-admin-bug-hunter-rewards-demo-fixture-v2   v2, isActive:true
 *
 * That pair exists precisely so this flow can be read without spending a real
 * tester's report on it. Where a case must perform the irreversible half —
 * confirming a bug — it does so against v2, which is the fixture reopened for
 * exactly that purpose.
 *
 * 🛑 THE CREDIT IS "Mock User 3", NOT "Mock User 18" (fixed 2026-09-29). The seed
 * sets `bugHunterId: "user-yugi-muto"` / `bugHunterName: "Mock User 3"`, and the
 * responses seed uses the same pair. The idempotency case asserted
 * byte-identity against "Mock User 18", so it would have failed on a correct
 * system — the worst shape a case can have, because the failure looks like a
 * product defect.
 *
 * 🛑 v1 CANNOT BE REOPENED AGAIN. It already carries `supersededByItemId`, and
 * the route returns 409 "This case has already been reopened" on exactly that.
 * The reopen case pointed at v1 and expected a new version to appear; it now
 * asserts the 409 on v1 and performs the real reopen on **v2**, which the
 * confirm-bug case above it has just made bug-confirmed. That is a deliberate
 * dependency between two cases in one batch, which is why they run in order.
 *
 * Both response rows ARE seeded (`tester-responses-seed-data.ts`), the v2 one
 * deliberately left `status: "new"` and unconfirmed so confirm-bug has
 * something to do. So no case here has to file a report first.
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
      "Read the confirmation dialog before accepting: it should be titled 'Confirm this bug?' and say the credit is awarded and the case disabled for other testers. Then accept it.",
      "Read the badge that appears on the row afterwards.",
      "Open /admin/tester-checklist, set the Status filter to 'All', and read the Status of that same case.",
    ],
    inputs: {
      caseId: "checklist-admin-bug-hunter-rewards-demo-fixture-v2",
      dialogTitle: "Confirm this bug?",
      creditedTo: "Mock User 3",
    },
    expectedBehaviour:
      "Confirming a bug does two things at once and both are irreversible from this screen: it credits exactly one tester, and it takes the case out of circulation so no second tester can answer it. A confirmation dialog must stand in front of it — an accidental click here spends a credit on the wrong person and silently shrinks the catalogue.",
    expectedUiState:
      "A dialog titled 'Confirm this bug?' appears BEFORE anything commits. After accepting, the row shows a confirmed-bug badge naming the crediting tester — the same name that was on the row beforehand, 'Mock User 3', not a different one. In the catalog the case's Status reads 'Bug Confirmed' rather than 'Active'.",
    expectedData: { creditedTesterUnchanged: true },
    endResult:
      "Survives a reload: the badge and the credited name are still there, and the case is still out of the Active view. 🛑 Leave v2 confirmed — the reopen case below needs a bug-confirmed case that has NOT already been superseded, and v2 is the only one a fresh seed can provide.",
  },

  "checklist-admin-bug-hunter-rewards-confirm-bug-idempotent": {
    roles: ["admin"],
    startPage: "/admin/tester-feedback",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/tester-feedback and select the All Submissions tab.",
      "Find a row whose case is ALREADY bug-confirmed — the demo fixture 'reported bug, already confirmed and reopened (v1, disabled)' is credited to Mock User 3.",
      "Read the tester name currently credited on it.",
      "Attempt 'Mark as Bug' on that row.",
      "Read whatever the screen says in response.",
      "Read the credited tester name again and compare it against the one noted earlier.",
    ],
    inputs: {
      caseId: "checklist-admin-bug-hunter-rewards-demo-fixture",
      creditedTo: "Mock User 3",
      expectedRefusal: "This case has already been confirmed as a bug",
    },
    expectedBehaviour:
      "A second confirmation on an already-confirmed case is REFUSED, and refused loudly. The failure mode this guards is silent re-crediting: two testers report the same case, an admin confirms twice, and the second confirmation quietly moves the credit off the person who actually found it. Nothing about that is visible unless the screen says so.",
    expectedUiState:
      "Either the action is absent/disabled on an already-confirmed row, or it is refused — the server answers 409 'This case has already been confirmed as a bug'. What must NOT happen is a success message. The credited name is byte-identical to the one read at the start.",
    expectedData: { creditedTo: "Mock User 3" },
    endResult:
      "Reload the page: the credit still reads Mock User 3, and the case has not gained a second confirmation.",
  },

  "checklist-admin-bug-hunter-rewards-reopen-case": {
    roles: ["admin"],
    startPage: "/admin/tester-checklist",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/tester-checklist and set 'Bug status' to 'Bug Confirmed'.",
      "Find 'Demo fixture — reported bug, already confirmed and reopened (v1, disabled)' and read its Status and its bug-hunter credit.",
      "Use its 'Reopen as New Test Case' row action and read what happens — v1 has already been superseded once, so expect a refusal rather than a new case.",
      "Now find the v2 fixture, which the confirm-bug case above has just made bug-confirmed, and use 'Reopen as New Test Case' on it.",
      "Read the new case that appears — its label, its Status, its version, and whether it carries any bug-hunter credit.",
      "Go back to the v1 and v2 cases and read their Status and credit again.",
      "Open /tester and search for the new case to confirm it is answerable.",
    ],
    inputs: {
      v1Id: "checklist-admin-bug-hunter-rewards-demo-fixture",
      v2Id: "checklist-admin-bug-hunter-rewards-demo-fixture-v2",
      newIdPattern: "{v2Id}-v3",
      v1Refusal: "This case has already been reopened",
    },
    expectedBehaviour:
      "Reopening creates a NEW version rather than resurrecting the old one, and a case can only be reopened ONCE — a second reopen would fork the chain into two live retests of the same finding. The original must keep both its disabled state and its bug-hunter credit: that credit records who found the defect, and a retest of the same behaviour does not undo the finding. Mutating the old row in place would erase the history the whole feature exists to keep.",
    expectedUiState:
      "v1 refuses the reopen — 409 'This case has already been reopened' — and is unchanged by the attempt. v2 reopens into a new row whose id ends '-v3' and whose version reads 3, Active and answerable from /tester, carrying NO bug-hunter credit of its own. Both older rows stay disabled and stay credited. A new case that inherited the credit, or an old row that lost it, is the failure.",
    expectedData: {
      originalStaysDisabled: true,
      originalKeepsCredit: true,
      newVersion: 3,
      newCaseHasCredit: false,
    },
    endResult:
      "Survives a reload: v1 and v2 disabled with their credits, the reopened v3 active and answerable.",
  },

  "checklist-admin-bug-hunter-rewards-catalog-default-active-filter": {
    roles: ["admin"],
    startPage: "/admin/tester-checklist",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/tester-checklist without touching any filter and read the total count shown.",
      "Search for 'Demo fixture' and write down every matching row with its Status.",
      "Switch the Status filter to 'All' and read the total count and the matching rows again.",
      "Switch the Status filter to 'Inactive' and read which of the demo fixtures appear.",
      "Set Status back to its default and set 'Bug status' to 'Bug Confirmed'.",
      "Read which rows appear under that filter, and confirm every one of them was absent from the default view.",
    ],
    inputs: { search: "Demo fixture" },
    expectedBehaviour:
      "The default view is the answerable catalogue, not everything ever written. A bug-confirmed case is deliberately out of circulation, so showing it by default would invite an admin to treat a closed finding as open work. Switching the filter must reveal it — hidden is not the same as gone.",
    expectedUiState:
      "Every bug-confirmed row is absent from the default view and present under Status 'All', under 'Inactive', and under Bug status 'Bug Confirmed'. The totals move in the direction each filter implies. v1 is bug-confirmed on any fresh seed, so it is the row to anchor on.\n\n🛑 Do NOT assert an absolute count of demo fixtures. The three cases above this one deliberately confirm v2 and reopen it as v3, so how many demo rows exist depends on whether they ran. The assertion is the FILTER SEMANTICS — hidden is not gone — not the arithmetic. If v2 and v3 exist, they must obey the same rule, which makes the case stronger rather than fragile.",
    expectedData: { defaultViewHidesBugConfirmed: true },
    endResult: "Read-only — no case is modified.",
  },
};
