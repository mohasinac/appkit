/*
 * WHY: Authored six-part procedures for the selling/seller-guide page.
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
  "checklist-selling-seller-guide-seller-guide-pages": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and find the guide or help entries in the sidebar.",
      "Open each guide page in turn and read its content.",
      "Write down any that renders empty, 404s, or repeats another page's text.",
      "Check each guide against the feature it describes — open that feature and confirm the guide's instructions match what is on screen.",
      "Follow every link inside the guides and note where each lands.",
    ],
    expectedBehaviour:
      "Every seller guide renders its own content and every link in it resolves. The fifth step is the one that matters most: a guide describing a screen that has since changed is worse than no guide, because the seller trusts it and then cannot find what it names.",
    expectedUiState:
      "Each guide shows a heading and body specific to its topic, with no two identical. Every internal link lands on a real page. Instructions match the current screens — a guide naming a control that no longer exists is the finding, quoted exactly.",
    expectedData: { brokenGuideLinks: 0 },
    endResult:
      "Read-only; nothing persists. Report stale instructions with the guide's name and the sentence that is wrong, not just that the page loads.",
  },
};
