/*
 * WHY: Authored six-part procedures for the selling/final-sale-authoring page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * A default that is ON is the hardest kind to test, because a field that never
 * saves reads back as its default and looks correct. Every case here therefore
 * turns the flag OFF and reloads — the only direction in which a broken save is
 * visible.
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
  "checklist-selling-final-sale-authoring-final-sale-defaults-on": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and go to the Returns step WITHOUT touching anything. The control is a toggle labelled 'Accept change-of-mind returns' — there is none named 'final sale' — and it stores the INVERSE: toggle OFF means finalSale, which is the default.",
      "Click 'Show all fields (advanced)' first — the quick form has no Returns step, so the toggle below is not on screen until you switch.",
      "Read its state. Expect it OFF, meaning final sale is on.",
      "Open /store/auctions/new and read the same toggle's state.",
      "Open /store/pre-orders/new and /store/classified/new and read it in each.",
    ],
    expectedBehaviour:
      "Final sale is on by default on every listing type, so a seller who never opens the setting is protected rather than silently exposed to returns they did not agree to.",
    expectedUiState:
      "The 'Accept change-of-mind returns' toggle reads OFF in all four creation forms before any interaction — OFF is what makes the listing final sale. A type whose default differs is the finding, named by type. Remember the polarity when recording: a toggle that reads ON here means returns ARE accepted, which is the opposite of the expected default.",
    expectedData: { defaultFinalSale: true },
    endResult:
      "Leave every editor without saving. This case cannot distinguish a real default from a field that fails to load — that is what the next case is for.",
  },
  "checklist-selling-final-sale-authoring-final-sale-opt-out-survives-reload": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and open the editor for 'Beyblade Burst B-01 Valkyrie'.",
      "Turn final sale OFF. 🛑 THE CONTROL IS INVERTED AND RENAMED: there is no switch labelled 'Final sale'. It is a toggle reading 'Accept change-of-mind returns', in the Returns step, and turning final sale OFF means turning that toggle ON. Its OFF state is the default and stores finalSale as final-sale.",
      "Save and read the confirmation.",
      "RELOAD the editor and read the control's state.",
      "Open /products/product-beyblade-burst-valkyrie and read whether a 'Final Sale' badge is shown — that is the badge's exact label.",
      "Turn the 'Accept change-of-mind returns' toggle back OFF — restoring final sale, which is the seeded default — then save and reload to confirm.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie", finalSale: false },
    expectedBehaviour:
      "Turning the flag off persists. Off is the only testable direction: a field that never saves reads back as its on default, so a case that only ever turns it ON passes against a completely broken save.",
    expectedUiState:
      "After the reload the control is still off and the public page shows no final-sale badge. A control that has reverted to on is the failure, and the save will have reported success.",
    expectedData: { finalSale: false },
    endResult:
      "The flag is back on by the final step, so the seeded product is left as it was.",
  },
  "checklist-selling-final-sale-authoring-return-policy-authorable-by-seller": {
    roles: ["seller", "guest"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the editor for 'Beyblade Burst B-01 Valkyrie' and find the return-policy field.",
      "Turn ON the toggle labelled 'Accept change-of-mind returns' in the Returns step — that is what turns final sale off. There is no control named 'final sale'; the switch is deliberately phrased positively so its ON state never means fewer buyer rights.",
      "Type 'QA Return Policy authorable — 7 days, unopened only.' into the policy field and save.",
      "RELOAD the editor and read the field.",
      "Open /products/product-beyblade-burst-valkyrie in a private window and find the return policy.",
      "Restore the original policy and turn the 'Accept change-of-mind returns' toggle back OFF, which restores final sale.",
    ],
    inputs: {
      productId: "product-beyblade-burst-valkyrie",
      returnPolicy: "QA Return Policy authorable — 7 days, unopened only.",
    },
    expectedBehaviour:
      "A seller can state their own return terms and those terms reach the buyer. A policy that saves in the dashboard but never renders publicly is worse than no field — the seller believes they have disclosed something the buyer never sees.",
    expectedUiState:
      "After the reload the editor holds the typed policy, and the public page shows it to a signed-out visitor. The policy is visible before purchase, not only on the order afterwards.",
    endResult:
      "The product is restored to its seeded policy and final-sale state by the final step.",
  },
  "checklist-selling-final-sale-authoring-final-sale-admin-override": {
    roles: ["admin", "seller"],
    startPage: "/admin/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and set final sale ON for 'Beyblade Burst B-01 Valkyrie', then save.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products, open the same product, and turn final sale OFF.",
      "Save and reload the admin editor to confirm.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Open that product's SELLER editor at /store/products/{id}/edit and read the 'Accept change-of-mind returns' toggle — the admin form names the field directly while the seller form inverts and renames it, which is the disagreement this case is for.",
      "Open that product's public page at /products/{its slug} and read whether the 'Final Sale' badge is shown.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "An admin override reaches the same stored field the seller edits, so both dashboards and the public page agree afterwards. An override held somewhere else would leave the seller's editor showing one answer and the buyer seeing another — and the buyer's is the one that binds.",
    expectedUiState:
      "After the admin's change the seller's editor shows the flag off and the public page shows no final-sale badge. A seller editor still reading on is the failure.",
    endResult:
      "Restore the seeded final-sale state as the last action, from whichever dashboard set it last.",
  },
  "checklist-selling-final-sale-authoring-final-sale-badges-render": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window in light mode.",
      "Find a card for a final-sale listing and read its badge.",
      "Open that listing's detail page and find the badge there.",
      "Read the badge against its background on both surfaces.",
      "Switch to dark mode and read both again.",
      "Open the checkout for that item and check the final-sale term is stated before payment.",
    ],
    expectedBehaviour:
      "The badge appears on the card, on the detail page, and in the checkout flow. It carries a term the buyer is agreeing to, so stating it only after purchase is too late — and a badge that is unreadable in one theme states nothing at all.",
    expectedUiState:
      "The badge is present and readable on all three surfaces in both themes. It overlays a card image, so it takes the solid pairing rather than a pale tint — an invisible label on a visible badge shape is the specific failure.",
    endResult:
      "Read-only apart from reaching checkout; do not place the order. Return the site to light mode afterwards.",
  },
};
