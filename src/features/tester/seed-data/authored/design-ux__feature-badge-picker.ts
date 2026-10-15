/*
 * WHY: Authored six-part procedures for the design-ux/feature-badge-picker page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

/*
 * Written against the 2026-10-15 conversion of the feature-badge control from a
 * checkbox grid to a searchable multi-select.
 *
 * 🛑 Three of these five cases exist for things the GRID did by accident and a
 * naive conversion silently loses — the scope headings, the per-row description,
 * and the selection ceiling. Each is written as an explicit before → after for
 * that reason: a searchable picker that has quietly dropped the "(platform)" /
 * "(your store)" distinction still looks like a successful conversion, and a
 * case reading "check the picker works" would pass against it.
 *
 * The create case is the one genuinely new capability. It is wired ONLY to the
 * store-scope route: `POST /api/admin/features` is admin-only, so offering it to
 * a seller would be a control that 403s, which is worse than no control.
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-feature-badge-picker-features-are-searchable": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as the seller who owns the store and open /store/products.",
      "Open any product for editing.",
      "Scroll to the 'Feature badges' section of the form.",
      "Open the control and type a few letters of a badge name.",
    ],
    expectedBehaviour:
      "Anything over five options is a searchable picker in this codebase. The control loads the platform badges eligible for this listing type plus the store's own, and filters them client-side as you type.",
    expectedUiState:
      "'Feature badges' is a SINGLE control that opens a searchable list with a text input — not a two-column grid of bordered checkbox tiles, which is what it was. Typing narrows the visible options, and selected badges appear as removable chips on the control.",
    endResult:
      "Closing and reopening the picker preserves the current selection. Nothing is saved until the product form itself is saved.",
  },

  "checklist-design-ux-feature-badge-picker-features-search-matches-description": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "With the badge picker open, note a badge whose description contains a word that is NOT in its label — 'Sealed' is described as 'Factory wrap intact and never opened'.",
      "Type that description-only word into the picker's search box, e.g. 'factory'.",
    ],
    inputs: { "picker search": "factory" },
    expectedBehaviour:
      "Each option's description is folded into its label text specifically so it remains searchable after the conversion. In the old grid the description was visible on every tile, so it was findable by eye; in a filtered list it would be unreachable unless it is part of what is matched.",
    expectedUiState:
      "The badge whose DESCRIPTION contains the typed word is listed, even though its name does not contain it. Searching a word in neither the label nor any description shows the no-results message instead.",
    endResult:
      "Clearing the search box restores the full list. No selection has changed.",
  },

  "checklist-design-ux-feature-badge-picker-features-scope-is-visible": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Open the badge picker on a product belonging to a store that has at least one custom badge of its own.",
      "Read the full text of several options in the list.",
      "Select one platform badge and one store badge, then close the picker and read the two chips.",
    ],
    expectedBehaviour:
      "The grid separated the two scopes under 'Platform features' and 'Store custom features' headings. A flat searchable list has no headings, so the scope is carried in each option's own text — which also means it survives into the selected chip, where the grid's headings never reached.",
    expectedUiState:
      "Every option ends with '(platform)' or '(your store)'. The two selected chips each still show which scope they came from. An option with no scope marker at all is a regression.",
    endResult:
      "The distinction persists after saving and reopening the product — it is derived from the badge's own scope, not from selection order.",
  },

  "checklist-design-ux-feature-badge-picker-features-respects-the-cap": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Open the badge picker and read the 'Selected: N of 24' line above it.",
      "Select badges one at a time until N reaches the stated maximum.",
      "Try to select one more badge.",
    ],
    expectedBehaviour:
      "The ceiling is applied to the incoming selection rather than by disabling unticked rows, because a multi-select has no per-row disabled state. Selections beyond the cap are refused, keeping the earliest ones — so the badge that fails is the one just clicked, which is what a user expects.",
    expectedUiState:
      "The counter stops at the maximum and does not go above it. Attempting to add one more does not increase the count and does not silently replace an existing selection. The counter line always matches the number of chips shown.",
    expectedData: { "selected badge count": "never exceeds the stated maximum" },
    endResult:
      "Saving the product stores at most the maximum number of badges. Reopening the product shows the same set.",
  },

  "checklist-design-ux-feature-badge-picker-features-inline-create": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Open the badge picker on one of your own products.",
      "Choose 'Create a badge for my store'.",
      "Enter a label such as 'QA inline badge' and leave the icon as its default.",
      "Submit the create form.",
      "Close the picker, reload the page, and reopen the picker.",
    ],
    inputs: { "Badge label": "QA inline badge", Icon: "star" },
    expectedBehaviour:
      "Creating posts to the store-scope features route, which sets the owning store server-side rather than trusting the request body, and scopes the new badge to the listing type being edited. The picker's option list is refetched afterwards so the badge becomes a real option rather than a chip with nothing behind it.",
    expectedUiState:
      "The create drawer closes on success and the new badge appears immediately as a SELECTED chip. Reopening the picker lists it among the options, marked '(your store)'. After a full page reload it is still listed and still selected on the product.",
    expectedData: {
      "new badge scope": "store",
      "new badge owner": "the signed-in seller's store",
    },
    endResult:
      "The badge persists as a store-scope feature and is available on that store's other products too. Remove it from the store's feature settings afterwards so it does not accumulate.",
  },
};
