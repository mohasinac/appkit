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
      "Open /store and find the 'Guides' group in the sidebar. It is the LAST group and it defaults CLOSED (defaultOpen: false), so expand it — seven entries: All Guides, Listings Guide, Orders Guide, Finance Guide, Settings, Capabilities, WhatsApp Catalog Sync.",
      "Click 'All Guides' to reach /store/guide. It is a hub and it links the same six sub-guides, so each one has two routes in — check both agree.",
      "Open each of the six in turn and read its content: /store/guide/listings, /store/guide/orders, /store/guide/finance, /store/guide/settings, /store/guide/capabilities, /store/guide/whatsapp.",
      "Write down any that renders empty, 404s, or repeats another page's text.",
      "Check each guide against the feature it describes — open that feature and confirm the guide's instructions match what is on screen. The WhatsApp guide is the one to read hardest: no seeded store carries a whatsappConfig, so a guide describing a configured integration describes a state no tester can reach.",
      "Follow every link inside the guides and note where each lands.",
    ],
    expectedBehaviour:
      "Every seller guide renders its own content and every link in it resolves. A guide describing a screen that has since changed is worse than no guide, because the seller trusts it and then cannot find what it names. The sidebar group defaulting closed is deliberate — guides are reference, not daily work — so a tester who does not expand it will wrongly conclude they are missing.",
    expectedUiState:
      "All six guides show a heading and body specific to their topic, with no two identical, and both the sidebar group and the hub reach all of them. Every internal link lands on a real page. Instructions match the current screens — a guide naming a control that no longer exists is the finding, quoted exactly.",
    expectedData: { brokenGuideLinks: 0 },
    endResult:
      "Read-only; nothing persists. Report stale instructions with the guide's name and the sentence that is wrong, not just that the page loads.",
  },
};
