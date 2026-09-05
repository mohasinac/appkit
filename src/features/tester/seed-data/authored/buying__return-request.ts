/*
 * WHY: Authored six-part procedures for the buying/return-request page.
 * WHAT: 7 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A RETURN IS AN ORDER STATUS, NOT AN ENTITY. Returns are views over orders, so
 * the request rides the order's own timeline and `return_requested` belongs to the
 * ACTIVE scope — it is the seller's next action item, and filing it under Closed
 * removes it from the queue the seller actually works from.
 *
 * Final sale is the axis these cases turn on, and it is not a blanket refusal:
 * "it never arrived" must be accepted on a final-sale item, because final sale is
 * a statement about changing your mind, not about the seller's obligation to
 * deliver. The two refusal cases and the two acceptance cases exist to keep those
 * apart.
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
  "checklist-buying-return-request-return-cta-only-when-returnable": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open a DELIVERED order and read whether a return control is offered.",
      "Open a PENDING order and read whether one is offered.",
      "Open a SHIPPED order and read the same.",
      "Open a CANCELLED order and read the same.",
      "Open a REFUNDED order and read the same.",
      "Open an order already in the return-requested state and read the same.",
    ],
    expectedBehaviour:
      "The return control appears only where a return is actually possible — after delivery and before a return has already been requested. Offering it on a pending or cancelled order produces a request nobody can action, and offering it twice on the same order produces a duplicate the seller has to reconcile.",
    expectedUiState:
      "Only the delivered order offers the control. Pending, shipped, cancelled and refunded orders do not. An order already in the return-requested state shows its state rather than offering the control again.",
    expectedData: { returnControlOnDeliveredOnly: true },
    endResult:
      "Read-only; request nothing. The seed carries an order in each status, so all six are reachable.",
  },
  "checklist-buying-return-request-return-not-received-accepted-on-final-sale": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and find a delivered order whose item was marked final sale.",
      "Confirm the order or its item shows the final-sale term.",
      "Open the return control and read every reason it offers.",
      "Select the not-received reason.",
      "Type 'QA Return not-received — the parcel never arrived.' and submit.",
      "RELOAD the order and read its status.",
    ],
    inputs: { reason: "not received", note: "QA Return not-received — the parcel never arrived." },
    expectedBehaviour:
      "Final sale does not override non-delivery. It is a statement about changing your mind, not about whether the seller has to deliver — so a not-received claim must be accepted on a final-sale item, and refusing it converts a delivery failure into a term the buyer never agreed to.",
    expectedUiState:
      "The not-received reason is offered and accepted despite the final-sale term. After the reload the order reads as return-requested. A blanket refusal citing final sale is the failure.",
    expectedData: { accepted: true },
    endResult:
      "The order carries a return request. Leave it for the admin triage case to pick up.",
  },
  "checklist-buying-return-request-return-change-of-mind-refused-by-name": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and find a different delivered final-sale order.",
      "Open the return control and read every reason offered.",
      "Select the change-of-mind reason.",
      "Read what happens — whether it is refused, and what the message says.",
      "Read whether the message names FINAL SALE as the reason for the refusal.",
    ],
    inputs: { reason: "change of mind" },
    expectedBehaviour:
      "Change of mind is refused on a final-sale item and the refusal NAMES final sale. A generic 'returns are not available' leaves the buyer believing the item is broken or the site is; naming the term tells them it was disclosed before purchase and points them at where they agreed to it.",
    expectedUiState:
      "The refusal names final sale specifically rather than reading as a generic unavailability. The reason is either not offered at all for this item, or offered and refused with that explanation.",
    expectedData: { accepted: false },
    endResult:
      "No return is created. A refusal that does not name the term is the finding, even though the outcome is correct.",
  },
  "checklist-buying-return-request-return-reason-is-persisted": {
    roles: ["buyer", "admin"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open a delivered order and open the return control.",
      "Select a reason and type 'QA Return reason-persisted — item arrived damaged in transit.' as the note.",
      "Submit and RELOAD the order.",
      "Read the reason and the note shown on the buyer's own view.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin returns surface, find that order, and read the reason and the note there.",
    ],
    inputs: { note: "QA Return reason-persisted — item arrived damaged in transit." },
    expectedBehaviour:
      "The reason and the buyer's note are stored on the order and readable by both sides. The note is the entire case an admin triages on — a request that persists its status and drops its note leaves the reviewer with nothing to judge, and the buyer with no record of what they said.",
    expectedUiState:
      "After the reload the buyer's view shows the reason and the full note. The admin surface shows the same text word for word rather than a truncated or summarised version.",
    expectedData: { notePersisted: true },
    endResult:
      "The return request carries its reason and note on both sides.",
  },
  "checklist-buying-return-request-return-partial-gates-selected-lines-only": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open a delivered order containing several items.",
      "Open the return control and read whether individual lines can be selected.",
      "Select ONE line and leave the others unselected.",
      "Read the refund figure the form states and compare it against that line's own price.",
      "Submit the request.",
      "RELOAD and read which lines are marked as being returned.",
    ],
    expectedBehaviour:
      "A partial return covers only the selected lines and the stated refund matches their prices — not the order total. Cancellation and return quantities are tracked per product, which is why a bundle or grouped line is stored as one row per member: the buyer returning one part of a set must not be quoted for all of it.",
    expectedUiState:
      "Individual lines are selectable, the stated refund matches only the selected line, and after the reload only that line is marked. An order-total refund for a single-line return is the failure.",
    expectedData: { linesReturned: 1 },
    endResult:
      "One line is under return and the others are untouched.",
  },
  "checklist-buying-return-request-return-prize-draw-still-refused-entirely": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open a delivered prize-draw order.",
      "Read whether a return control is offered at all.",
      "If one is offered, open it and read every reason available.",
      "Attempt a return and read the refusal.",
      "Read whether the refusal explains why a draw entry cannot be returned.",
    ],
    expectedBehaviour:
      "A prize-draw entry cannot be returned once the draw has run, whatever the reason — the entry was consumed by the draw and the outcome is already assigned. This refusal is broader than the final-sale one, which still admits non-delivery, and the two must not be collapsed into the same message.",
    expectedUiState:
      "Either no return control is offered, or every reason is refused with an explanation naming the draw. A not-received reason being accepted here would be wrong, unlike on a final-sale physical item.",
    expectedData: { accepted: false },
    endResult:
      "No return exists. The contrast with the final-sale case is the point — one admits non-delivery and this one does not.",
  },
  "checklist-buying-return-request-return-terms-snapshotted-at-purchase": {
    roles: ["buyer", "seller"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and set a product's return policy to 'QA Policy snapshot — 7 days, unopened.' with final sale OFF.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!, then buy that product.",
      "Open the order and read the return terms recorded on it.",
      "Sign back in as tyson and change the product's return policy to 'QA Policy snapshot — no returns.' with final sale ON.",
      "Sign back in as the buyer and open the SAME order again.",
      "Read the return terms shown on it now.",
      "Open the return control and read which terms apply.",
    ],
    inputs: {
      policyAtPurchase: "QA Policy snapshot — 7 days, unopened.",
      policyAfter: "QA Policy snapshot — no returns.",
    },
    expectedBehaviour:
      "The terms are captured on the order at purchase and do not follow later edits to the listing. Reading them live from the product would let a seller retroactively withdraw a return right the buyer already agreed to — the same reasoning that stores an order's provenance once at creation and never recomputes it.",
    expectedUiState:
      "The order still shows the terms that applied when it was placed, and the return control honours those rather than the seller's new policy. Terms that changed under an existing order is the failure, and it is the one with a consumer consequence.",
    expectedData: { termsFollowPurchase: true },
    endResult:
      "Restore the product's original return policy and final-sale flag. The order should still show what it was bought under.",
  },
};
