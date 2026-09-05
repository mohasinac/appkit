/*
 * WHY: Authored six-part procedures for the cta-layout/editor-action-bar page.
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

export const authored: Record<string, AuthoredCase> = {
  "checklist-cta-layout-editor-action-bar-four-buttons-wrap-not-overflow": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Resize the browser window to 375 pixels wide.",
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new.",
      "Type 'QA Product editor-action-bar' in the title field so the form becomes dirty and Discard appears.",
      "Read the action bar and count how many buttons are visible.",
      "Try to scroll the page sideways.",
      "Read the right edge of the bar for any button that is partly off screen.",
    ],
    inputs: { viewportWidth: 375, title: "QA Product editor-action-bar" },
    expectedBehaviour:
      "Four actions that cannot fit one row wrap onto a second. They used to be non-shrinking children of a non-wrapping row, which does not overflow gracefully — it simply runs off the right edge, taking the last button with it.",
    expectedUiState:
      "All four of Discard, Preview, Save draft and Publish are fully visible, wrapping onto a second line as needed. Nothing is cut off at the right edge, and the page does not scroll sideways at all.",
    expectedData: { visibleButtonCount: 4 },
    endResult:
      "Leave the editor without saving, so no draft product is created. Restore the window width afterwards.",
  },
};
