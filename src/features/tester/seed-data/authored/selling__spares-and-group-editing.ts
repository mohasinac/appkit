/*
 * WHY: Authored six-part procedures for the seller side of Part Two —
 *      listing a spare, and the shared group-stock/rules editor.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * 🛑 "Stock is independent per listing" is the whole premise of the shared
 * editor, so the round trip that proves it (edit one, reload, check the
 * OTHER member) is the case that actually matters here — not whether the
 * form submits.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const SELLER_SIGNIN = "Sign in as a seller account that owns the first store in the directory.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-selling-spares-seller-and-group-editing-seller-can-list-a-spare": {
    roles: ["seller"],
    startPage: "/store/spares",
    steps: [
      SELLER_SIGNIN,
      "Click \"List a Spare\".",
      "Fill in title, price, colourway, and a stock quantity, then Publish.",
      "Return to /store/spares.",
    ],
    expectedBehaviour:
      "The seller product-shell accepts `listingType: \"spares\"` the same way it accepts the other nine types — this is the one new entry in `ProductListingMode`, so a missing wiring here would show as a form that silently fails to save or a blank listing-type dropdown.",
    expectedUiState:
      "The new spare appears in the /store/spares list with the colourway shown as its distinguishing column (not a size column, which the other print types use), the price entered, and status Published.",
    endResult:
      "BEFORE spares existed, there was no seller-facing way to list one at all. AFTER: creating one is the same shape as creating a sticker or an art print, just under a different type.",
  },

  "checklist-selling-spares-seller-and-group-editing-group-stock-edit-is-independent": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      SELLER_SIGNIN,
      "Open the editor for a group PARENT product (one with \"isGroupParent\").",
      "In the Members list, note the current stock figures for two different children, A and B.",
      "In the shared stock editor, change ONLY child A's stock to a new number. Leave B's input untouched.",
      "Click \"Save group stock\".",
      "Reload the editor and re-read both children's stock figures.",
    ],
    expectedBehaviour:
      "`PATCH .../group/stock` writes ONLY the member rows named in the request body — `saveGroupStock()` sends just the touched ids via `stockDraft`/`motDraft`, never a blanket broadcast across every child. Stock is independent per listing by design: a spare is one physical object a seller happens to have, and selling or restocking one must not touch another's figure.",
    expectedUiState:
      "After reload, child A shows the NEW figure you entered. Child B shows EXACTLY the figure it had before — unchanged to the unit. This is the single most important assertion in this group: a shared pool bug would show up as B silently changing when only A was edited.",
    endResult:
      "BEFORE this editor existed, each child's stock could only be edited by opening its own separate product page — tedious but safe. AFTER: editing is faster AND must remain exactly as safe. If B's figure moved at all, the editor is pooling stock rather than editing independent listings, which contradicts the feature's entire premise.",
  },

  "checklist-selling-spares-seller-and-group-editing-group-rules-save-and-reload": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      SELLER_SIGNIN,
      "Open a group parent's editor and find the \"Selection rules\" form.",
      "Change the min, max, per-item cap, and discount fields to new values different from what they currently show.",
      "Click \"Save rules\".",
      "Reload the editor page.",
      "As a buyer (different tab/session), open that group's public picker.",
    ],
    expectedBehaviour:
      "`PATCH .../group` writes only the keys present in the body, via the `in` test rather than a spread — so saving rules must not blank the group title, and reloading must show exactly what was saved, not a stale cached value. The public picker reads the SAME stored fields through `readGroupRules`, so it must reflect the new numbers on its very next load, with no separate publish step.",
    expectedUiState:
      "After reload, the editor's four rule fields show the NEW values you typed, not the old ones and not blank. The buyer-facing picker, opened fresh, states the NEW rules in its rule-summary text — if it still shows the old numbers, something is caching the group document past this write.",
    endResult:
      "BEFORE: a group had no rules to edit at all. AFTER: a seller's edit is live on the storefront immediately, and a reload of the editor proves the write actually persisted rather than only updating client-side state.",
  },

  "checklist-selling-spares-seller-and-group-editing-group-stock-partial-failure-reported": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      SELLER_SIGNIN,
      "Open a group parent's editor in TWO browser tabs.",
      "In tab 1, unlink one child from the group and confirm it.",
      "Switch to tab 2 (which still shows the now-unlinked child in its member list) and, without reloading, edit that same child's stock PLUS a different, still-valid child's stock.",
      "Click \"Save group stock\" in tab 2.",
    ],
    expectedBehaviour:
      "The route re-fetches the CURRENT member list server-side before writing, so the unlinked child's id is no longer a member and is rejected — but the request must not fail as a whole. The still-valid child's stock edit must still be written. This is the 207-style partial result the route is built for.",
    expectedUiState:
      "A toast or message reports a partial result (e.g. \"Updated 1; 1 could not be updated.\"). Reloading the editor shows the still-valid child's stock at its NEW value — the save for that row was not discarded just because the other row was stale.",
    endResult:
      "BEFORE this endpoint existed, there was no shared editor and so no partial-failure case to handle. AFTER: a stale row (the common case when two admins or two tabs edit the same group near-simultaneously) costs nothing to the rows that were still valid.",
  },
};
