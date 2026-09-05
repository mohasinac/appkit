/*
 * WHY: Authored six-part procedures for the selling/seller-custom-brands page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A BRAND PAGE MATCHES ITS PRODUCTS BY DISPLAY NAME, not by slug. So a brand
 * created here and the brand string written onto the product must agree exactly,
 * and the public brand page is the only place that disagreement becomes visible —
 * the seller's own dashboard shows the product filed correctly either way.
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
  "checklist-selling-seller-custom-brands-seller-brand-inline-create": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and find the brand picker.",
      "Type QA Brand inline-create into its search box.",
      "Read what the picker offers when nothing matches.",
      "Use the create control the picker offers and fill the form it opens.",
      "Save the new brand and read the picker's selection afterwards.",
    ],
    inputs: { brandName: "QA Brand inline-create" },
    expectedBehaviour:
      "A picker with more than five options is searchable, and where a seller might legitimately need a value that does not exist it offers inline creation. The newly created option is auto-selected — making the seller find it again in the list is the half-finished version of this feature.",
    expectedUiState:
      "Searching a name that does not exist shows a create control rather than only an empty state. After saving, the picker shows 'QA Brand inline-create' as the current selection without the seller re-opening it.",
    endResult:
      "A brand exists. Leave the product editor without saving — the brand is what the next cases read.",
  },
  "checklist-selling-seller-custom-brands-seller-brand-inline-create-persists": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and open the brand picker.",
      "Search for QA Brand inline-create.",
      "Read whether it is offered as an existing option.",
      "Reload the page and search for it again.",
      "Open a different creation form — the auction one — and search for it there.",
    ],
    inputs: { brandName: "QA Brand inline-create" },
    expectedBehaviour:
      "The brand was written to the shared categories collection as a brand-typed row, so it is available to every form that reads brands, not only the one that created it. A value that exists only in the creating form's local state disappears on reload.",
    expectedUiState:
      "The brand is offered as an existing option in the product form, after a reload, and in the auction form. Being absent from any of the three is the failure.",
    endResult: "Leave every editor without saving.",
  },
  "checklist-selling-seller-custom-brands-seller-brand-inline-create-duplicate-rejected": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and open the brand picker.",
      "Use the create control and type QA Brand inline-create — the name that already exists.",
      "Save and read the message.",
      "Open the picker again and search that name.",
      "Count how many options match it.",
      "Try once more with the same name in different case: qa brand INLINE-CREATE.",
    ],
    inputs: { brandName: "QA Brand inline-create", caseVariant: "qa brand INLINE-CREATE" },
    expectedBehaviour:
      "A duplicate is refused rather than creating a second row. Because a brand page matches products by DISPLAY NAME, two rows with the same name are two brands the read side cannot tell apart — and a case-differing duplicate is the same problem wearing a disguise.",
    expectedUiState:
      "The duplicate attempt is refused with a readable message. Exactly one option matches the name in the picker. The case-differing attempt is refused too — accepting it creates the ambiguity this rule exists to prevent.",
    expectedData: { matchingOptionCount: 1 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-seller-custom-brands-seller-brand-product-saves-with-new-brand": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and type 'QA Product custom-brand' as the title.",
      "Select QA Brand inline-create in the brand picker.",
      "Type 500 as the price, fill every other required field, and publish.",
      "RELOAD the product's editor and read the brand.",
      "Open the product's public page and read the brand link below the title.",
      "Click that link.",
    ],
    inputs: { title: "QA Product custom-brand", brandName: "QA Brand inline-create", price: 500 },
    expectedBehaviour:
      "The product stores both the brand's slug and its display name, and the two stay in lockstep. The public page's brand link resolves to the brand's own page — a link built from one field while the page matches on the other lands somewhere empty.",
    expectedUiState:
      "After the reload the editor shows the brand. The public page shows a brand link reading 'QA Brand inline-create' and clicking it opens that brand's page rather than a 404.",
    endResult:
      "The product exists and is the fixture the next case reads. Delete it after that case.",
  },
  "checklist-selling-seller-custom-brands-seller-brand-appears-on-public-brands-page": {
    roles: ["guest"],
    startPage: "/brands",
    steps: [
      "Open /brands in a private window with no session.",
      "Look for QA Brand inline-create in the list.",
      "Open its brand page.",
      "Read the product grid and look for 'QA Product custom-brand'.",
      "Sign in as tyson@beybladearena.in / TempPass123! and delete the QA product, then the QA brand.",
    ],
    inputs: { brandName: "QA Brand inline-create", productTitle: "QA Product custom-brand" },
    expectedBehaviour:
      "A seller-created brand becomes a real public brand page listing its products. The match is on display name, so this page is where a name-versus-slug mismatch finally shows — the brand page renders and its grid is empty, which reads as a brand with no stock rather than as a broken link.",
    expectedUiState:
      "The brand is listed on /brands and its page shows 'QA Product custom-brand' in the grid. An empty grid on a brand that demonstrably has a product is the failure this whole page builds toward.",
    expectedData: { productsOnBrandPage: 1 },
    endResult:
      "Both the product and the brand are deleted by the final step, so nothing accumulates across runs.",
  },
};
