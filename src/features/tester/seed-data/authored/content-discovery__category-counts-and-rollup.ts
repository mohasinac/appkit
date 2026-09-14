/*
 * WHY: Authored six-part procedures for content-discovery/category-counts-and-rollup.
 * WHAT: 8 cases, keyed by full checklist id.
 *
 * 🛑 THE RULE THESE CASES ENCODE: a category's count is its OWN items plus every
 * descendant's, and clicking it must LIST exactly those items. With
 * A → (B, C → D) and own counts A=5, B=5, C=8, D=2, the numbers are D=2, B=5,
 * C=10 and **A=20** — and opening A lists all twenty.
 *
 * Both halves were wrong on 2026-09-14. The nightly reconciler could not express
 * own-vs-rollup at all — `setMetrics` wrote one number to both fields — so it
 * OVERWROTE the live trigger's correct values every night: 19 of 65 rows
 * disagreed with a recount, every one low. And the child chips beneath a
 * category header rendered the OWN count while the header rendered the rollup,
 * so a parent reading 20 could sit above chips summing to 5.
 *
 * Nothing errored in either case. A wrong number is simply a number, which is
 * why every case below compares TWO things that must agree rather than checking
 * that a number is present.
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
  "checklist-content-discovery-category-counts-and-rollup-leaf-count-matches-its-listing": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories.",
      "Open the tile for x-starters — a leaf with no child chips of its own.",
      "Write down the count shown on its tile.",
      "Open that category.",
      "Count the product cards listed, using the pager total rather than counting by eye if there is more than one page.",
    ],
    expectedBehaviour:
      "A count is a promise about a listing. On a leaf there are no descendants, so the number and the listing are the same set and any difference is a stale counter.",
    expectedUiState:
      "The number on the tile equals the number of products the category page lists.",
    expectedData: { tileCountEqualsListingTotal: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-counts-and-rollup-parent-count-includes-descendants": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories/x-tops — a parent whose children include x-starters and x-boosters.",
      "Write down the count on the parent's tile.",
      "Open the parent and write down the count shown on each of its child chips.",
      "Add the children's counts together.",
      "Open the parent's own listing and note whether any product there is filed directly under the parent rather than a child.",
    ],
    expectedBehaviour:
      "The parent's number is its own items plus every descendant's. A parent showing only its own items reports a number smaller than the branch it stands for, and a parent showing only its descendants loses whatever is filed directly under it.",
    expectedUiState:
      "The parent's count is greater than or equal to the sum of its children's counts, and equals that sum plus anything filed directly under the parent.",
    expectedData: { parentCountAtLeastSumOfChildren: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-counts-and-rollup-parent-listing-includes-descendant-items": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories/x-tops.",
      "Open one of its CHILD categories and write down the title of a product listed there.",
      "Go back to the parent category's own page.",
      "Search the parent's listing for that same product, paging through if necessary.",
    ],
    expectedBehaviour:
      "The rule governs the LISTING, not only the number. A count that rolls up while the listing does not is worse than both being wrong together: the page then contradicts itself in a way that reads as a pagination problem.",
    expectedUiState:
      "The child's product appears in the parent category's listing.",
    expectedData: { childProductVisibleOnParent: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-counts-and-rollup-header-and-child-chips-agree": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open a parent category page that shows a row of child chips.",
      "Write down the number in the page header.",
      "Write down the number on each child chip.",
      "Open one child and compare its own header number to the number its chip showed.",
    ],
    expectedBehaviour:
      "Every number a visitor reads is the same kind of number — the rollup. Showing the rollup in the header and the own-count on the chips answers two different questions with identically-styled figures side by side, and nothing on the screen says which is which.",
    expectedUiState:
      "The number on a child's chip equals the number in that child's own page header.",
    expectedData: { chipMatchesChildHeader: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-counts-and-rollup-root-count-is-the-whole-subtree": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories/spinning-tops — a root category.",
      "Write down its count.",
      "Open it and write down the count on each of its direct children.",
      "Open each child in turn and write down its children's counts, until you reach leaves.",
      "Add up every leaf's count, plus anything filed directly under an intermediate node.",
    ],
    expectedBehaviour:
      "A root's count is the sum over its whole subtree. This is the case that catches a reconciler summing only ONE level of descendants — it produces a number that is plausible, consistently too low, and never flagged.",
    expectedUiState:
      "The root's count equals the total counted across the subtree.",
    expectedData: { rootCountEqualsSubtreeSum: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-counts-and-rollup-sibling-isolation": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories/x-tops, which has several children.",
      "Open the first child and write down a product title from its listing.",
      "Open the second child's listing.",
      "Search the second child for that product.",
      "Compare the two children's counts.",
    ],
    expectedBehaviour:
      "Roll-up goes upward only. A product must not be counted in, or listed under, a sibling branch — the failure that produces is a set of counts that all look slightly too large and still sum plausibly.",
    expectedUiState:
      "The first child's product is absent from the second child's listing.",
    expectedData: { productLeakedToSibling: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-counts-and-rollup-guest-sees-the-same-counts": {
    roles: ["guest", "buyer"],
    startPage: "/categories",
    steps: [
      "Open /categories in a private window with no session.",
      "Write down the counts on the first four category tiles.",
      "Sign in as the buyer rehan.sheikh@gmail.com / TempPass123!.",
      "Open /categories again and read the same four tiles.",
    ],
    expectedBehaviour:
      "A category count is a fact about the catalogue, not about the viewer. If the two differ, something viewer-scoped is leaking into a shared number — the likeliest candidate being a filter that hides test fixtures from one audience but is counted for the other.",
    expectedUiState: "All four numbers are identical in both sessions.",
    expectedData: { countsDifferBetweenSessions: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-counts-and-rollup-brand-count-matches-its-listing": {
    roles: ["guest"],
    startPage: "/brands",
    steps: [
      "Open /brands.",
      "Write down the product count shown for one brand.",
      "Open that brand's page.",
      "Read the total the listing reports.",
    ],
    expectedBehaviour:
      "A brand is a row in the same collection as a category and its count is written by the same trigger — but brands hang off `brandSlug` rather than the category chain, so they are a separate pass and can be missed entirely while every category is correct. Brand rows had no counter writer at all until 2026-09-14.",
    expectedUiState:
      "The number on the brand tile equals the number of products the brand page lists.",
    expectedData: { brandTileMatchesListing: true },
    endResult: "Nothing is changed; this case only reads.",
  },
};
