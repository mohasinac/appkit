/*
 * WHY: Authored six-part procedures for Part Two's buyer-facing surfaces —
 *      spares, made-to-order, and self-assembled group selections with rules
 *      and a discount.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * 🛑 EVERY CASE IS AN EXPLICIT BEFORE -> AFTER. A spares page or a group picker
 * returning 200 with plausible cards is not evidence any of this works — the
 * exclusion from the general catalogue, the stock bypass, and the discount
 * arithmetic are all silent-failure-shaped.
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
  "checklist-buying-spares-and-groups-spares-not-in-general-catalogue": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Search /products for a known spare's title (e.g. \"Cross Dranzer\" or \"Galeon Bit Chip\").",
      "Note whether it appears in the results.",
      "Navigate to /spares and search for the same title.",
    ],
    expectedBehaviour:
      "`spares` sets `inGeneralCatalogue: false`, so `listPublicProducts` on /products never includes it. The same row is reachable only through /spares, which spans exactly that one listing type.",
    expectedUiState:
      "The spare's title is ABSENT from the /products search results. The same title IS present in the /spares search results, with its own card and price.",
    endResult:
      "BEFORE spares existed, there was no tenth listing type at all. AFTER: a spare is reachable from exactly one place, never two. If it appears on both pages, the catalogue-exclusion flag broke. If it appears on neither, the /spares page or its nav wiring broke.",
  },

  "checklist-buying-spares-and-groups-spares-nav-entry-present": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Open the main nav's \"Products\" dropdown (hover on desktop, tap the caret on mobile).",
      "Look for a \"Spares\" entry in the list of children.",
      "Click it.",
    ],
    expectedBehaviour:
      "Every listing type excluded from the general catalogue must be linked from MAIN_NAV_ITEMS or it is reachable from nowhere. Spares is one of those types, so its nav child is not decoration — it is the only discovery path.",
    expectedUiState:
      "The dropdown shows a \"Spares\" row with a puzzle-piece icon and a one-line description. Clicking it navigates to /spares and the page renders a product grid.",
    endResult:
      "BEFORE: no entry existed because the type did not exist. AFTER: the entry is present, and clicking it lands on a real page, not a 404 or a redirect back to /products.",
  },

  "checklist-buying-spares-and-groups-made-to-order-buyable-at-zero-stock": {
    roles: ["buyer"],
    startPage: "/products/sticker-beyblade-custom-print-on-demand",
    steps: [
      "Open the seeded \"Custom Beyblade Sticker Sheet — Print on Demand\" listing.",
      "Read the stock/availability line near the price.",
      "Click Add to Cart, then proceed through checkout with a test payment method.",
    ],
    expectedBehaviour:
      "This listing has `madeToOrder: true` and `availableQuantity: 0`. `baseAvailable()` returns true unconditionally for a made-to-order row before either quantity check runs, so stock must gate nothing on it — not the PDP badge, not Add to Cart, not checkout.",
    expectedUiState:
      "The page shows \"Made to order — printed when you order, so it never runs out.\" It must NOT show \"Out of Stock\" or any stock count. Add to Cart is enabled and checkout completes normally.",
    endResult:
      "BEFORE the `madeToOrder` flag existed, a listing at zero stock was always sold out — there was no way to sell a print-on-demand item without lying about a fake stock number. AFTER: zero stock and buyable coexist correctly for this one flag.",
  },

  "checklist-buying-spares-and-groups-group-picker-shows-rules-before-choosing": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open any member of the seeded \"Burst & X Attackers You Might Like\" group (e.g. the Valkyrie listing).",
      "Scroll to the group/\"Pick what you want\" section and open the full picker (it may be behind a \"Show all\" link once 5+ members exist).",
      "Read the picker before selecting anything.",
    ],
    expectedBehaviour:
      "The group carries `groupMinMembers: 2`, `groupMaxMembers: 3`, `groupMaxUnitsPerMember: 2`, `groupDiscountPercent: 10`. `describeGroupRules()` must render these as plain text near the top of the picker — stated BEFORE the buyer commits to a selection, not only surfaced as a refusal after submitting.",
    expectedUiState:
      "Text reading something like \"Pick at least 2 · Pick at most 3 · Max 2 of each · 10% off the selection\" is visible above the member rows, before any quantity has been changed from zero.",
    endResult:
      "BEFORE: a group had no rules at all, so there was nothing to state. AFTER: the rules are visible up front. If the picker shows nothing until a violation occurs, the rule-statement UI is missing even though enforcement might still work — that is a real but easy-to-miss partial failure.",
  },

  "checklist-buying-spares-and-groups-group-picker-blocks-and-explains-invalid-selection": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "On the same group picker, set exactly ONE member's quantity to 1 and leave the rest at 0.",
      "Observe the Add button and any message shown.",
      "Change the selection to 3 units of a single member instead (0 of the others).",
      "Observe the Add button and message again.",
      "Correct the selection to 2 different members at 1 unit each.",
    ],
    expectedBehaviour:
      "`checkGroupRules()` runs client-side on every change. One item selected violates `groupMinMembers: 2` (\"Pick at least 2 different items\"). Three units of one item violates `groupMaxUnitsPerMember: 2` (\"At most 2 of … per order\"). Both must disable Add; neither should require a page reload to re-enable it once fixed.",
    expectedUiState:
      "Step 1: Add is disabled, a warning box names the minimum-items rule. Step 2 (after changing selection): Add is still disabled, a DIFFERENT warning naming the per-item cap appears — not the same message as step 1. Step 3: both warnings disappear and Add becomes enabled, with no reload.",
    endResult:
      "BEFORE: a group selection had no rules to violate. AFTER: an invalid selection is caught before the buyer wastes a click on a server round-trip, and the message names the SPECIFIC rule broken rather than a generic \"invalid selection\".",
  },

  "checklist-buying-spares-and-groups-group-discount-applied-and-shown": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "On the group picker, note the individual prices of two different members.",
      "Select 1 of each of those two members.",
      "Read the total shown in the picker.",
      "Add to cart and open the cart page; read the line total there.",
      "Proceed to checkout and read the order review total for that line.",
    ],
    expectedBehaviour:
      "`groupDiscountPercent: 10` is applied inside `deriveLinePrice` — the single writer of a multi-member line's price — so the discount must be visible and IDENTICAL in all three places: the picker's live total, the cart line, and the checkout review. 10% below the sum of the two members' individual prices, rounded to the paisa.",
    expectedUiState:
      "All three totals show the same discounted figure (sum of the two prices × 0.9, rounded to 2 decimals). The picker additionally shows the pre-discount sum struck through or labelled, so the discount is legible rather than just a smaller number.",
    endResult:
      "BEFORE: a self-assembled group had no price relationship to its members beyond a plain sum. AFTER: the discount is one number, computed once, read identically everywhere — if any of the three disagrees with the other two, the cart total and the invoice have diverged, which is the exact failure Root Cause #75 describes.",
  },
};
