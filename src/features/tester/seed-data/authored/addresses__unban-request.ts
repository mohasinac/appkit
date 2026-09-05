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

export const authored: Record<string, AuthoredCase> = {
  "checklist-addresses-unban-request-empty-note-says-why": {
    roles: ["buyer"],
    startPage: "/user/addresses",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses and find an address showing a banned state.",
      "Click 'Request Unban'.",
      "Leave the note box completely empty and click Submit.",
      "Read where any message appears.",
      "Type 'Too short' in the note box and click Submit.",
      "Type 'This address was banned in error; it is my registered home address.' and click Submit.",
    ],
    inputs: {
      shortNote: "Too short",
      validNote: "This address was banned in error; it is my registered home address.",
      minimumLength: 20,
    },
    expectedBehaviour:
      "Submitting with an empty or too-short note fails loudly on the field and names the 20-character minimum. The note is the ENTIRE case a reviewer reads, so a request without one is not a request — but a disabled button with a bare return in its handler tells the user nothing about why.",
    expectedUiState:
      "The Submit button is enabled even when the box is empty. Pressing it puts an error on the note field naming the minimum length. 'Too short' produces the same error. The full sentence is accepted and a confirmation appears.",
    expectedData: { minimumNoteLength: 20 },
    endResult:
      "One unban request exists, carrying the full note. A silently disabled button that does nothing when pressed is the failure — the user cannot tell it from a broken page.",
  },
};
