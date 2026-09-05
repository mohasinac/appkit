/*
 * WHY: Authored six-part procedures for the public-pages/legal-policy-pages page.
 * WHAT: 7 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * All six policy pages share one renderer, so most of these cases are really
 * about the ONE thing that differs per page: which content the renderer is
 * handed, and which related links it derives.
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
  "checklist-public-pages-legal-policy-pages-shipping-refund-policy": {
    roles: ["guest"],
    startPage: "/shipping-policy",
    steps: [
      "Open /shipping-policy in a private window with no session.",
      "Read the headings and body content.",
      "Open /refund-policy and read the headings and body content.",
      "Compare the two — they must not be the same text.",
    ],
    expectedBehaviour:
      "Each policy page renders its own copy through the shared renderer. Two policy pages showing identical text means the page key is not reaching the content lookup and one of them is displaying the other's terms.",
    expectedUiState:
      "Both pages show headings and paragraphs specific to their subject. Neither is blank, neither 404s, and the two bodies are visibly different documents.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-legal-policy-pages-refund-policy-not-raw-json": {
    roles: ["guest"],
    startPage: "/refund-policy",
    steps: [
      "Open /refund-policy in a private window with no session.",
      "Read the first line of the page body.",
      "Search the page for the characters {\"type\":\"doc\".",
      "Search the page for the words 'content', 'attrs' and 'paragraph' appearing as visible text rather than as prose.",
    ],
    expectedBehaviour:
      "The renderer injects its content as HTML, so whatever is stored must BE html. A rich-text editor document stored as JSON in that field is rendered as its own source — the page returns 200, the layout is intact, and the body is a wall of braces.",
    expectedUiState:
      "The body reads as English policy prose. It does not begin with {\"type\":\"doc\", and none of 'content', 'attrs' or 'paragraph' appears as visible page text.",
    endResult:
      "Read-only. Re-seed before running this: the fix was to set the seeded override to an empty string so the page falls back to its own copy, and a stale database still holds the JSON.",
  },
  "checklist-public-pages-legal-policy-pages-privacy-cookies-security": {
    roles: ["guest"],
    startPage: "/privacy",
    steps: [
      "Open /privacy in a private window with no session and read the body.",
      "Open /cookies and read the body.",
      "Open /security and read the body.",
      "Compare all three — none may repeat another's text.",
    ],
    expectedBehaviour:
      "Three distinct policies render three distinct documents through the shared renderer.",
    expectedUiState:
      "Each page shows its own headings and paragraphs. None is blank, none 404s, and no two are the same document.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-legal-policy-pages-ethics-page-loads": {
    roles: ["guest"],
    startPage: "/ethics",
    steps: [
      "Open /ethics in a private window with no session.",
      "Find the section covering live animals and plants.",
      "Read it for vendor verification, a lawful-destination check, CITES paperwork and specialist transport.",
      "Open / and find the Ethics link in the footer's Support column.",
      "Open /about and find the 'How we hold ourselves to this →' link in the Values section.",
    ],
    expectedBehaviour:
      "The page exists, states the live-item commitments specifically, and is reachable from both the footer and the About page. A page nobody can navigate to is as unfinished as one that does not render.",
    expectedUiState:
      "The live-animal section names all four commitments — vendor verification, lawful destination, CITES paperwork, specialist transport — rather than gesturing at 'responsible sourcing'. Both links reach /ethics.",
    expectedData: { liveItemCommitmentCount: 4 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-legal-policy-pages-code-of-conduct-loads": {
    roles: ["guest"],
    startPage: "/code-of-conduct",
    steps: [
      "Open /code-of-conduct in a private window with no session.",
      "Read the page for sections on listing honestly, bidding in good faith and review integrity.",
      "Read it for the enforcement and appeal ladder.",
      "Open / and find the Code of Conduct link in the footer's Legal column.",
    ],
    expectedBehaviour:
      "The page covers all four topics and is reachable from the footer's Legal column. The appeal ladder matters most — a code that states rules without stating how to contest an enforcement is half a document.",
    expectedUiState:
      "Sections on listing honestly, bidding in good faith, review integrity and the enforcement/appeal ladder are all present. The footer link reaches the page.",
    expectedData: { topicCount: 4 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-legal-policy-pages-policy-related-links-exclude-self": {
    roles: ["guest"],
    startPage: "/ethics",
    steps: [
      "Open /terms in a private window and read the Related Policies list at the foot of the page.",
      "Count the links and check whether Terms itself is among them.",
      "Repeat on /privacy, reading and counting the same list.",
      "Repeat on /cookies.",
      "Repeat on /refund-policy.",
      "Repeat on /ethics.",
      "Repeat on /code-of-conduct.",
    ],
    expectedBehaviour:
      "The related-links list is derived from one registry with the current page filtered out, so every page offers exactly the other five. A self-link is the tell that the filter is missing — it reads as a working link and goes nowhere new.",
    expectedUiState:
      "All six pages show exactly five related links, and on none of them is the current page one of them. Four links means the registry is short; six means the self-filter is not running.",
    expectedData: { relatedLinkCount: 5 },
    endResult:
      "Read-only; nothing persists. Checking all six is the case — the filter can be right on one page and wrong on another only if the list is hand-written per page, which is what this rules out.",
  },
  "checklist-public-pages-legal-policy-pages-policy-admin-html-override": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Open /ethics in a private window and read the first paragraph.",
      "Sign in as admin@letitrip.in / TempPass123! in a normal window.",
      "Open /admin/site?tab=legal and find the 'Our Ethics' textarea.",
      "Type <p>QA Ethics policy-admin-html-override</p> into it.",
      "Save.",
      "Return to the private window and reload /ethics immediately.",
      "Read the first paragraph.",
      "Go back to the admin textarea, clear it completely, and save again.",
      "Reload /ethics in the private window once more.",
    ],
    inputs: { override: "<p>QA Ethics policy-admin-html-override</p>" },
    expectedBehaviour:
      "The whole chain runs on save: admin textarea, stored override, renderer read, and a cache bust. These pages are cached for an hour, so without the revalidation the admin's change would be invisible for up to sixty minutes and would look like a save that failed.",
    expectedUiState:
      "/ethics shows the typed sentence immediately after saving — not after a wait. After the textarea is cleared and saved, the page reverts to its default copy on the next reload.",
    expectedData: { revalidatedImmediately: true },
    endResult:
      "The textarea is empty again and /ethics shows its default content. Leaving the override in place would break the ethics-page-loads case above, which reads the real copy.",
  },
};
