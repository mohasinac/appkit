/*
 * WHY: Authored six-part procedures for the two Wave-11 adoptions —
 *      price-index local resolution and the compare overlay's new
 *      "add another" typeahead.
 * WHAT: 4 case(s), keyed by full checklist id.
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
  "checklist-content-discovery-price-index-tool-price-index-resolves-locally": {
    roles: ["guest"],
    startPage: "/tools/price-index",
    steps: [
      "Open /tools/price-index in a private window and open DevTools → Network.",
      "Clear the network log.",
      "Type a real model name into the search box and submit.",
      "Read the network log for what fired.",
      "Read the results on the page.",
    ],
    inputs: { query: "Dragoon G" },
    expectedBehaviour:
      "The query-to-leaf resolution step runs in the browser against the local search artifact, at zero Firestore reads — before this, it was a searchTxt push-down query on every submit. The server is now asked only for the sale bands of the already-resolved id(s).",
    expectedUiState:
      "The network log shows the one-time artifact fetch (a .json, if not already cached from an earlier visit) plus exactly one request to a bands endpoint carrying resolved id(s) — not a raw free-text query parameter. The page shows real min/median/mean/max figures for a model with recorded sales.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-price-index-tool-price-index-falls-back-when-index-off": {
    roles: ["admin"],
    startPage: "/tools/price-index",
    steps: [
      "Sign in as admin and flip siteSettings.search.indexEnabled to false (via Firestore console or an admin settings surface, if one exists for it).",
      "Open /tools/price-index in a private window.",
      "Search a real model name and submit.",
      "Read the results.",
      "Restore the flag to true afterwards.",
    ],
    needsReview: true,
    reviewNote:
      "Needs the kill switch flipped off to observe the fallback path, which an ordinary run never exercises — flagged for a human or an admin-tooling pass.",
    expectedBehaviour:
      "With the index unavailable, the tool must fall back to the original query-based endpoint rather than going blank. The fallback pays a real Firestore query, which is the accepted cost of the flag being off.",
    expectedUiState:
      "The same real sale figures appear as when the index is on — slower, possibly, but not absent.",
    endResult: "Restore siteSettings.search.indexEnabled to true before ending the session.",
  },

  "checklist-content-discovery-compare-overlay-add-item-compare-add-another-via-typeahead": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products and select one item for comparison (checkbox).",
      "Open the compare overlay.",
      "Find the 'Add another to compare' box inside the overlay.",
      "Type a different product's name and read the suggestions.",
      "Click one.",
      "Read the overlay's columns.",
    ],
    expectedBehaviour:
      "Before this, the only way to add an item was selecting it via a listing-page checkbox BEFORE opening the overlay — there was no way to add a further item once inside it. The typeahead resolves a slug locally and the overlay fetches that product the same way it already fetches checkbox-selected ones.",
    expectedUiState:
      "A new column appears for the picked item — its image, price and specs — without closing the overlay or returning to the grid. The originally-selected item's column is still there.",
    endResult: "Close the overlay; nothing persists.",
  },

  "checklist-content-discovery-compare-overlay-add-item-compare-add-hidden-at-column-limit": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products and select items for comparison until the compare overlay's maximum column count is reached (checkboxes, then the typeahead if room remains).",
      "Open or stay in the overlay once full.",
      "Look for the 'Add another to compare' box.",
    ],
    expectedBehaviour:
      "A picker that cannot actually add anything because the overlay is full is worse than an absent one — it invites a click that does nothing.",
    expectedUiState:
      "The 'Add another' box is completely ABSENT once the column limit is reached, not merely disabled or greyed out.",
    endResult: "Close the overlay; nothing persists.",
  },
};
