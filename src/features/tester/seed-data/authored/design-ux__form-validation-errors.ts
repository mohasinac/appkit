/*
 * WHY: Authored six-part procedures for the design-ux/form-validation-errors page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE FIRST CASE IS A REGRESSION GUARD, NOT A FEATURE CHECK. Eleven views call
 * validate() from a mount effect, and the summary was deliberately un-gated by
 * `touched` — together those made every schema-driven form open by listing every
 * empty required field, accusing the user of mistakes before they had typed
 * anything. The fix gates the DISPLAY, never the computation: dropping the mount
 * effect would stop the summary updating as the user fixes fields, which is the
 * whole reason it exists.
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
  "checklist-design-ux-form-validation-errors-error-summary-shows-beside-submit": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new and read the page WITHOUT typing anything.",
      "Look for any list of errors, and for any red field.",
      "Click Save with every field still empty.",
      "Read what appears and where it sits relative to the Save button.",
      "Count the errors listed and compare with the number of empty required fields.",
    ],
    expectedBehaviour:
      "On first paint the form is silent — no summary, no red fields — because the user has done nothing wrong yet. The summary appears only after a submit is attempted, and then sits near the control that was pressed rather than at the top of a long form where it can be off screen.",
    expectedUiState:
      "Before the click: no error summary and no red fields, even though the schema would fail. After the click: a summary listing every failing field, visible without scrolling away from Save. A form that opens already listing six errors is the exact regression this case guards.",
    expectedData: { errorsBeforeSubmit: 0 },
    endResult:
      "Nothing is saved. The pre-submit silence is half the case — a summary that is always correct but always visible fails it.",
  },
  "checklist-design-ux-form-validation-errors-error-summary-live-on-change": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new and click Save with every field empty.",
      "Read the summary and count the errors it lists.",
      "Type 'QA Address error-summary-live' into the name field.",
      "Read the summary again without clicking anything.",
      "Fill the street, city, state and postal code fields one at a time, reading the summary after each.",
    ],
    inputs: { name: "QA Address error-summary-live" },
    expectedBehaviour:
      "Once a submit has been attempted the summary tracks every keystroke, so a user watching it can see the list shrink as they work. The count has to be part of the summary's own label — the panel is only re-published when that label changes, and a static label would freeze its contents at six errors while the user fixes five of them.",
    expectedUiState:
      "The count falls by one as each field is filled — 'Fix 6 issues' becomes 'Fix 5 issues' and so on — and the fixed field leaves the list. A summary that stays at its original count until Save is pressed again is the failure.",
    endResult:
      "Nothing is saved unless the form is submitted. Leave without saving.",
  },
  "checklist-design-ux-form-validation-errors-error-summary-step-tagged": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new, a multi-step wizard.",
      "Advance past the first step leaving a required field on it empty, and continue to a later step.",
      "Leave a required field on that later step empty too.",
      "Attempt to publish.",
      "Read the summary and note whether each error names the step it belongs to.",
      "Click the error that belongs to the first step.",
    ],
    expectedBehaviour:
      "In a wizard an error is useless without its step — the user cannot see the field it refers to. Each entry is tagged with its owning step and clicking it jumps there, which is only possible because the wizard supplies a field-to-step map to the summary.",
    expectedUiState:
      "Every error names its step. Clicking one navigates to that step with the offending field visible and marked. An untagged flat list on a multi-step form is the failure even when the errors themselves are right.",
    endResult:
      "Nothing is published. Leave the wizard without saving.",
  },
  "checklist-design-ux-form-validation-errors-error-summary-supplements-inline": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new.",
      "Click into the city field, then click out of it without typing.",
      "Read whether an error appears under that field, and whether a summary has appeared.",
      "Click Save with the form still empty.",
      "Read both the summary and the individual fields.",
    ],
    expectedBehaviour:
      "The two are gated differently on purpose. An inline error is gated on the field being touched — a field the user visited and left empty SHOULD say so immediately. The summary is gated on a submit attempt, because it speaks about fields the user has not reached yet. The summary supplements the inline errors; it never replaces them.",
    expectedUiState:
      "Leaving the city field empty marks that field alone, with no summary yet. After Save, the summary lists every failing field AND each field is still individually marked. A summary with no inline marks, or inline marks with no summary, are both failures.",
    endResult: "Nothing is saved. Leave without saving.",
  },
};
