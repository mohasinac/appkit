/*
 * WHY: Authored six-part procedures for the selling/seller-shipping-payouts-setup page.
 * WHAT: 10 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 SEPARATE PAGES WERE CONSOLIDATED INTO TABS, so the old URLs are live links in
 * bookmarks, emails and guides. Three cases here are about that seam: old URLs
 * must still land, the tab must be written back to the URL so a deep link works
 * in both directions, and a search box must only promise what its corpus can
 * deliver.
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
  "checklist-selling-seller-shipping-payouts-setup-shipping-page": {
    roles: ["seller"],
    startPage: "/store/shipping",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's shipping settings and read every field and section.",
      "Note which shipping options the store currently offers and their rates.",
      "Read whether a free-shipping threshold is configurable and what it is set to.",
      "Reload the page and confirm the same values are shown.",
    ],
    expectedBehaviour:
      "The page renders the store's real shipping configuration. Free shipping is DERIVED from who pays rather than being a field of its own, so a control labelled 'free shipping' has to write the field the read side actually consults — a filter on a field the document does not have matches nothing forever.",
    expectedUiState:
      "Every configured option and rate is shown with real values rather than blanks. Reloading reproduces them.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-seller-shipping-payouts-setup-shipping-configs-crud": {
    roles: ["seller"],
    startPage: "/store/shipping",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's shipping settings and create a config named 'QA Shipping configs-crud' with a rate of 99.",
      "Save, RELOAD, and read every field of it.",
      "Edit only its rate to 149, save, RELOAD, and read every field again including the name.",
      "Open a product's editor and check the new config is offered as a shipping choice.",
      "Delete the config and RELOAD to confirm.",
    ],
    inputs: { name: "QA Shipping configs-crud", rateBefore: 99, rateAfter: 149 },
    expectedBehaviour:
      "Create, edit and delete persist, and an edit to one field leaves the others alone. A new config becomes available to the listing forms immediately — a config that exists only on its own settings page is a config no listing can use.",
    expectedUiState:
      "After each reload the config holds exactly what was saved. Following the rate edit the name is unchanged. The config appears in a product editor's shipping choices.",
    endResult: "The config is deleted by the final step.",
  },
  "checklist-selling-seller-shipping-payouts-setup-payout-methods-crud": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's payout methods and read the existing ones.",
      "Note how any existing account number or UPI id is displayed.",
      "Add a method named 'QA Payout methods-crud' with test details and save.",
      "RELOAD and read how the new method's details are displayed.",
      "Open the browser's View Source and search for the full account identifier you typed.",
      "Delete the method.",
    ],
    inputs: { name: "QA Payout methods-crud" },
    expectedBehaviour:
      "Payout details are PII-encrypted at rest and shown masked. This is one of the few places a seller's bank identifier exists in the product at all, so the source check is the real assertion — a masked display over an unmasked payload is a leak that looks like a fix.",
    expectedUiState:
      "Existing and new methods both show masked identifiers rather than full ones. The full identifier does not appear anywhere in the page source, including the embedded data payload.",
    expectedData: { fullIdentifierInSource: 0 },
    endResult:
      "The method is deleted by the final step. A full account number in the source fails the case regardless of how the page renders.",
  },
  "checklist-selling-seller-shipping-payouts-setup-payout-settings-page": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's payout settings and read every field and toggle.",
      "Read whether the payout schedule, hold period and minimum amount are shown.",
      "Change one editable setting and save.",
      "RELOAD and read every setting again.",
      "Restore the changed setting.",
    ],
    expectedBehaviour:
      "The page shows the seller's own payout settings and saves what they change. Platform-side figures such as the hold period and the minimum payout amount are informational here — they are not buyer-facing and were once being published by an unauthenticated public endpoint, so a seller seeing them is correct and a public page showing them is not.",
    expectedUiState:
      "Settings render with real values and the changed one survives the reload. Every other setting is unchanged after the save.",
    endResult: "The setting is restored by the final step.",
  },
  "checklist-selling-seller-shipping-payouts-setup-consolidated-tabs-old-urls": {
    roles: ["seller"],
    startPage: "/store/shipping",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open each of the pre-consolidation URLs directly in the address bar, one at a time.",
      "For each, read where the browser lands and which tab is open.",
      "Note any that 404 or land on the first tab rather than the one they name.",
      "Read the final URL each one settles on.",
    ],
    expectedBehaviour:
      "An old URL lands on the consolidated page WITH its own tab open. These URLs are live in bookmarks, emails and guides, so a 404 breaks links that were correct when they were written — and landing on tab one is only marginally better, since the user still has to hunt.",
    expectedUiState:
      "Every old URL resolves and opens the tab it corresponds to. None 404s and none lands on the default tab. Record any that do, by URL.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-seller-shipping-payouts-setup-consolidated-tabs-url-writeback": {
    roles: ["seller"],
    startPage: "/store/shipping",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the consolidated settings page and read the URL.",
      "Click a different tab and read the URL again.",
      "Copy that URL, open it in a new tab, and read which tab is open.",
      "Press the browser back button and read which tab is shown.",
      "Open the page with an unknown tab value in the URL and read what happens.",
    ],
    expectedBehaviour:
      "Selecting a tab writes it to the URL, so the deep link works in both directions and back walks the tabs. An unknown value falls back to the default quietly — the realistic cause is a stale bookmark from a renamed tab, which is not an error condition.",
    expectedUiState:
      "The URL changes with the tab and reopening it lands on that tab. Back returns to the previous tab. An unknown value opens the default with no error banner and no blank panel.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-shipping-payouts-setup-print-center-selection-deeplink": {
    roles: ["seller"],
    startPage: "/store/print-center",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/print-center and select two items to print.",
      "Read the URL and check the selection is represented in it.",
      "Copy the URL and open it in a new tab.",
      "Read whether the same two items are selected on arrival.",
      "Reload and read the selection again.",
    ],
    expectedBehaviour:
      "A print selection is deep-linkable so it can be reopened or handed to a colleague. Holding it in component state alone means the URL describes a different page than the one on screen, and reloading loses the work.",
    expectedUiState:
      "The URL encodes the selection, the pasted URL arrives with the same two items selected, and a reload preserves them. A selection lost on reload is the failure.",
    endResult: "Clear the selection; nothing is printed.",
  },
  "checklist-selling-seller-shipping-payouts-setup-search-box-promises-match-corpus": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open each store listing page that has a search box and read its placeholder text.",
      "Write down what each placeholder claims to search — title, sku, buyer, id.",
      "For each page, search a value of every kind its placeholder names.",
      "Write down any kind the placeholder names that returns nothing when it should match.",
      "Search zzzznope on each page and confirm zero results.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "A placeholder is a promise about what the corpus can match. Naming a field the search index does not carry produces a search that fails for a reason the user cannot see — they conclude the record does not exist. Placeholders promising something unmatchable have been found and removed before.",
    expectedUiState:
      "Every kind a placeholder names returns results when a matching value is searched. 'zzzznope' returns zero everywhere. A placeholder promising a field that matches nothing is the finding, quoted with the page it is on.",
    expectedData: { unkeptPlaceholderPromises: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-shipping-payouts-setup-exact-search-boxes-commit-on-enter": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a store listing whose search is exact-match and read its helper text.",
      "Type a full matching value but do NOT press Enter — wait five seconds and read the rows.",
      "Press Enter and read the rows.",
      "Clear the box, type a partial value, press Enter, and read the rows.",
      "Type zzzznope, press Enter, and read the rows.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "An exact-match box commits on Enter rather than searching as you type. Encrypted fields can only be matched through a blind index, so a partial value cannot match — searching mid-typing would fire a query per keystroke, every one of which is guaranteed to return nothing.",
    expectedUiState:
      "Nothing changes while typing. Enter runs the search and the full value returns its rows. The partial value returns none, and the helper text explains that matching is exact. 'zzzznope' returns none.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-shipping-payouts-setup-consolidated-tabs-command-palette": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and open the command palette or header search.",
      "Type shipping and read the results.",
      "Click the result and read which page and which tab it opens.",
      "Repeat with payout, reading the results and where they land.",
      "Type zzzznope and read the results.",
    ],
    inputs: { query1: "shipping", query2: "payout", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Search reaches individual TABS, not only the consolidated page, because a tab is where the setting actually is. Landing on the page's first tab and leaving the seller to hunt is the same failure as the old-URL case, arriving from a different direction.",
    expectedUiState:
      "Both queries return entries that open the consolidated page ON the relevant tab. 'zzzznope' returns nothing rather than the full list of settings.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
};
