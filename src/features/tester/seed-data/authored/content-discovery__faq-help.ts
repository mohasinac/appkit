/*
 * WHY: Authored six-part procedures for the content-discovery/faq-help page.
 * WHAT: 3 case(s), keyed by full checklist id.
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
  "checklist-content-discovery-faq-help-faq-bottom-borders": {
    roles: ["guest"],
    startPage: "/faqs",
    steps: [
      "Open /faqs in a private window at a desktop width of 1280 pixels.",
      "Look at the divider between each question row and the next.",
      "Look specifically at the LAST row in a category, below its text.",
      "Expand one question and look at the dividers again.",
      "Switch the site to dark mode and look at every divider once more.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "Rows are separated by a divider between them, with none trailing after the last row — a stray border under the final item reads as a truncated list. Divider colour comes from a theme token that inverts, so it stays visible in both themes rather than being a fixed near-white line that vanishes on dark.",
    expectedUiState:
      "A divider sits between consecutive rows and there is none below the last row of a category. Expanding a question does not double the divider or leave a hairline across the open panel. Every divider is visible in dark mode.",
    endResult: "Read-only; nothing persists. Return the site to light mode afterwards.",
  },
  "checklist-content-discovery-faq-help-faq-mobile-count": {
    roles: ["guest"],
    startPage: "/faqs",
    steps: [
      "Resize the browser window to 390 pixels wide.",
      "Open /faqs in a private window with no session.",
      "WAIT for the page to settle before reading any number. This page has been measured showing zero questions at 2.5 seconds and 62 at 6 — a count taken early is confidently wrong, and this case is entirely about comparing counts.",
      "Read the count shown against each category.",
      "Open one category and count the questions it actually holds, waiting again before counting.",
      "Compare the two numbers.",
      "Try to scroll the page sideways.",
    ],
    inputs: { viewportWidth: 390 },
    expectedBehaviour:
      "The count beside a category matches what opening it reveals, at mobile width as at desktop. A count computed before an active-only filter is applied over-reports by every inactive entry.",
    expectedUiState:
      "Each category's count matches its contents. Nothing is clipped at 390px and the page does not scroll sideways. Counts are not hidden entirely on mobile — they are the reason a visitor opens one category rather than another.",
    expectedData: { mismatchedCountCount: 0 },
    endResult: "Read-only; nothing persists. Restore the window width afterwards.",
  },
  "checklist-content-discovery-faq-help-tabs-mobile-dropdown": {
    roles: ["guest"],
    startPage: "/faqs",
    steps: [
      "Open /faqs at a desktop width of 1280 pixels and read how the categories are presented.",
      "Resize the window to 390 pixels wide.",
      "Read how the categories are presented now.",
      "Open the mobile control and select a different category.",
      "Read which category's questions are shown and check the control names the selected one.",
      "Try to scroll the page sideways.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "A tab strip too wide for a phone becomes a dropdown rather than a sideways-scrolling row, so no category is hidden off the right edge where nobody looks for it.",
    expectedUiState:
      "At 1280 the categories are a tab strip. At 390 they are a dropdown listing every category, and selecting one switches the questions AND updates the control's own label. The page does not scroll sideways at either width.",
    endResult: "Read-only; nothing persists. Restore the window width afterwards.",
  },
  "checklist-content-discovery-faq-help-faq-search-filters-and-survives-reload": {
    roles: ["guest"],
    startPage: "/faqs",
    steps: [
      "Open /faqs in a private window with no session.",
      "WAIT for the questions to appear before counting anything. 🛑 This page hydrates client-side and the difference is not subtle — it has been measured showing zero questions at 2.5 seconds and 62 at 6. A count taken early produces a confident, wrong answer, and that has already happened twice on this exact page.",
      "Count the questions visible across all categories once the page has settled.",
      "Type shipping into the search box and commit it.",
      "Read the count and confirm it is SMALLER than the unfiltered count, and that the remaining questions are about shipping.",
      "Read the address bar and check the term is in the URL as ?q=shipping.",
      "RELOAD with that URL and confirm the same filtered set comes back, waiting again before judging.",
      "Clear the box, type zzzznope, and commit.",
      "Read the result — a named empty state and zero questions, not the full list.",
      "Clear the search and confirm the original count returns.",
    ],
    inputs: { realQuery: "shipping", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The search box filters the questions and the term round-trips through the URL, so a filtered view is shareable and survives a reload. The nonsense control is the whole case: a real term returns plausible questions whether or not the filter ran at all, so only zzzznope separates filtering from returning everything. The seed ships 63 FAQs across seven categories, which is enough for a real term to narrow visibly rather than by one row.",
    expectedUiState:
      "'shipping' shows fewer questions than the unfiltered list and they are about shipping. The URL carries ?q=shipping and reloading reproduces that view. 'zzzznope' shows a named empty state with zero questions — a blank panel with no message is a different failure and should be recorded as such. Clearing restores the original count.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "Read-only; nothing persists beyond the URL. A full list under zzzznope is the failure. So is an empty page under a real term, which on this page is far more likely to be a count taken before hydration than a broken filter — wait, then look again, before recording either.",
  },
};
