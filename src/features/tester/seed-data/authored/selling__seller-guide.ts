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
    startPage: "/store/guide",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and search the whole sidebar for a guide or help entry. EXPECT TO FIND NONE — and record that, because it is the finding rather than a failure to look properly: /store/guide is reachable only by typing the URL, while the ADMIN sidebar carries a full 'All Guides' section.",
      "Open /store/guide directly. It is a hub, and it links all six sub-guides.",
      "Open each of the six in turn and read its content: /store/guide/listings, /store/guide/orders, /store/guide/finance, /store/guide/settings, /store/guide/capabilities, /store/guide/whatsapp.",
      "Write down any that renders empty, 404s, or repeats another page's text.",
      "Check each guide against the feature it describes — open that feature and confirm the guide's instructions match what is on screen. The WhatsApp guide is the one to read hardest: no seeded store carries a whatsappConfig, so a guide describing a configured integration describes a state no tester can reach.",
      "Follow every link inside the guides and note where each lands.",
    ],
    expectedBehaviour:
      "Every seller guide renders its own content and every link in it resolves, and the hub is REACHABLE. Two separate claims: a guide describing a screen that has since changed is worse than no guide, because the seller trusts it and then cannot find what it names — and a guide nobody can navigate to is worse still, because it reads as absent while the work of writing it has already been paid for.",
    expectedUiState:
      "All six guides show a heading and body specific to their topic, with no two identical, and the hub links all six. Every internal link lands on a real page. Instructions match the current screens — a guide naming a control that no longer exists is the finding, quoted exactly. The sidebar offers no route to any of it, which is a separate finding and is expected today.",
    expectedData: { brokenGuideLinks: 0 },
    endResult:
      "Read-only; nothing persists. Report stale instructions with the guide's name and the sentence that is wrong, not just that the page loads. Report the missing sidebar entry separately — six built pages behind an unlinked hub is a wiring gap, not a content one.",
  },
};
