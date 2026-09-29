/*
 * WHY: Authored six-part procedures for the cta-layout/editor-action-bar page.
 * WHAT: 1 case, keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 /store/products/new OPENS THE QUICK FORM, NOT THIS BAR (corrected
 * 2026-09-29). SellerProductShell picks formMode 'quick' whenever mode is
 * create and the listing type is standard, and QuickProductForm's action row
 * has TWO buttons — 'Publish' and 'Save Draft' — plus a ghost
 * 'Show all fields (advanced)' beneath them. No Discard, no Preview, and no
 * four-button bar to overflow. The case has to take the advanced switch first.
 *
 * 🛑 AND THE FULL FORM'S BAR HOLDS THREE, NOT FOUR. FormShell's ActionRow is
 * Discard as the `anchor` (a ghost button, ALWAYS present rather than appearing
 * when the form goes dirty), then Save draft, then Publish. Preview is not in
 * this row at all — it lives in the FormShell TOP bar, and only when a preview
 * slot is supplied. A case counting four buttons in one row is counting a
 * button that is somewhere else.
 *
 * The labels differ between the generic shell and this editor, so the case asks
 * the tester to RECORD what they read rather than asserting one spelling:
 * FORM_ACTION_META says 'Discard' / 'Save Draft' / 'Publish', while
 * SellerProductShell renders 'Save as draft & finish later' and
 * 'Publish {listingTypeLabel}'. Either way the layout question — does anything
 * run off the right edge at 375px — is unchanged, and that is the case.
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
  "checklist-cta-layout-editor-action-bar-four-buttons-wrap-not-overflow": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Resize the browser window to 375 pixels wide.",
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and read its action row. This is the QUICK form: expect two buttons, Publish and Save Draft, and a ghost link reading 'Show all fields (advanced)'.",
      "Click 'Show all fields (advanced)' to reach the full editor.",
      "Type 'QA Product editor-action-bar' in the Product Name field.",
      "Read the action bar and write down every button in it, in order, with its exact label.",
      "Try to scroll the page sideways.",
      "Read the right edge of the bar for any button that is partly off screen, and the left edge for Discard — it is anchored there rather than sitting beside the other two.",
    ],
    inputs: {
      viewportWidth: 375,
      title: "QA Product editor-action-bar",
      quickFormButtons: 2,
      fullFormButtons: 3,
    },
    expectedBehaviour:
      "Actions that cannot fit one row wrap onto a second. They used to be non-shrinking children of a non-wrapping row, which does not overflow gracefully — it simply runs off the right edge, taking the last button with it. Discard is the row's anchor rather than a third sibling, because a flat justify-between row with three children opened the gap between Save draft and Publish instead of beside Discard.",
    expectedUiState:
      "Every button in the bar is fully visible, wrapping onto a second line as needed. Nothing is cut off at the right edge and the page does not scroll sideways at all. Expect THREE in the full editor — a Discard anchored left, a save and a publish — and do not count Preview: it is in the top bar, not this row, and only when a preview slot is supplied. Record the exact labels you read; they differ between the generic shell and this editor.",
    expectedData: { quickFormButtonCount: 2, fullFormButtonCount: 3, horizontalScroll: false },
    endResult:
      "Leave the editor without saving, so no draft product is created. Restore the window width afterwards.",
  },
};
