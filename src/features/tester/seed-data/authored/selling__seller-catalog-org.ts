/*
 * WHY: Authored six-part procedures for the selling/seller-catalog-org page.
 * WHAT: 7 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A PRODUCT CARRIES ITS FULL ANCESTOR CHAIN so a parent category page can match
 * on its own id alone. Nothing on the WRITE side derives that chain yet — the
 * convention is maintained by hand in the seed — so a product filed through a form
 * against a deep category gets a single-slug array and is invisible on every
 * ancestor page. The first category case checks exactly that.
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
  "checklist-selling-seller-catalog-org-seller-categories-crud": {
    roles: ["seller"],
    startPage: "/store/categories",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's categories page and read the list.",
      "Create one named 'QA Category catalog-org' and save.",
      "RELOAD and confirm it is listed.",
      "Rename it to 'QA Category catalog-org renamed' and save, then RELOAD and read the name.",
      "Delete it and RELOAD to confirm it is gone.",
    ],
    inputs: {
      name: "QA Category catalog-org",
      renamed: "QA Category catalog-org renamed",
    },
    expectedBehaviour:
      "Create, rename and delete all persist. The rename is the one worth watching: a create handler that derives a slug from the name while the update handler leaves the slug alone is the deliberate convention here, so the NAME must change while the URL stays stable.",
    expectedUiState:
      "Each operation survives its reload. After the rename the new name is shown; the category's own URL is unchanged, which is correct rather than a bug — an auto-recomputed slug would break every existing link.",
    endResult: "The category is deleted by the final step.",
  },
  "checklist-selling-seller-catalog-org-seller-sublisting-categories-crud": {
    roles: ["seller"],
    startPage: "/store/sublisting-categories",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's sublisting-categories page and read the list.",
      "Create one named 'QA Sublisting catalog-org' with a description and save.",
      "RELOAD and read every field.",
      "Rename it to 'QA Sublisting catalog-org renamed', save, and RELOAD.",
      "Read the page title and description shown for it, and check they reflect the new name.",
      "Delete it.",
    ],
    inputs: {
      name: "QA Sublisting catalog-org",
      renamed: "QA Sublisting catalog-org renamed",
    },
    expectedBehaviour:
      "A sublisting category's derived page metadata is recomputed on rename. Deriving it only at creation freezes the title and description at the original name, so the page keeps describing itself as something it is no longer called — a create-time transform the update path does not repeat.",
    expectedUiState:
      "After the rename and reload, both the name AND the derived title and description reflect the new name. Metadata still naming the original is the failure.",
    endResult: "The sublisting category is deleted by the final step.",
  },
  "checklist-selling-seller-catalog-org-sublisting-categories-standard-toolbar": {
    roles: ["seller"],
    startPage: "/store/sublisting-categories",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's sublisting-categories page and write down every toolbar control, left to right.",
      "Open /store/products and write down its toolbar controls the same way.",
      "Compare the two orderings.",
      "Type zzzznope into the search box and read the result count.",
      "Look for any empty gap in the toolbar where a control would sit.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "This listing uses the shared toolbar scaffold, so its controls match every other listing's in kind and order. The nonsense query is the control that proves the search box filters rather than decorates.",
    expectedUiState:
      "The two toolbars present the same controls in the same order. 'zzzznope' returns zero rows and an empty state, not the full list. No empty gap where a control was removed.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-catalog-org-seller-listing-templates-crud": {
    roles: ["seller"],
    startPage: "/store/listing-templates",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/listing-templates and read the list.",
      "Create a template named 'QA Template catalog-org' with a category, a condition and a description filled in, and save.",
      "RELOAD and read every field of the saved template.",
      "Open /store/products/new and apply that template.",
      "Read which fields it populated.",
      "Delete the template.",
    ],
    inputs: { name: "QA Template catalog-org" },
    expectedBehaviour:
      "A template stores a reusable set of field values and applying it populates them in a new listing form. There are two template features in this codebase — an older product-template one superseded by this listing-template one — so confirming which page is reachable from the sidebar matters as much as the CRUD itself.",
    expectedUiState:
      "The template survives its reload with every field. Applying it in the product form fills those fields rather than only the name. A template that saves but populates nothing is the failure.",
    endResult:
      "The template is deleted by the final step; leave the product editor without saving.",
  },
  "checklist-selling-seller-catalog-org-seller-category-inline-create": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and find the category picker.",
      "Type QA Category inline-create into its search box.",
      "Read what the picker offers when nothing matches.",
      "Use the create control and complete the form it opens.",
      "Read the picker's selection afterwards.",
    ],
    inputs: { categoryName: "QA Category inline-create" },
    expectedBehaviour:
      "The category picker offers inline creation for the same reason the brand picker does — a seller listing something genuinely new should not have to abandon the form. The created option is auto-selected.",
    expectedUiState:
      "A create control appears when the search matches nothing, and after saving the picker shows the new category as selected without being re-opened.",
    endResult:
      "A category exists. Leave the editor without saving — it is what the next case reads.",
  },
  "checklist-selling-seller-catalog-org-seller-category-inline-create-persists": {
    roles: ["seller", "guest"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new, search the category picker for QA Category inline-create, and confirm it is offered.",
      "Type 'QA Product inline-category' as the title, select that category, type 400 as the price, and publish.",
      "Open the product's public page and read its category links below the title.",
      "Count how many category links are shown.",
      "Click the one naming QA Category inline-create.",
      "Delete the product and the category afterwards.",
    ],
    inputs: {
      categoryName: "QA Category inline-create",
      title: "QA Product inline-category",
      price: 400,
    },
    expectedBehaviour:
      "The category persists and the product is filed under it. The product's category list is supposed to be the full ancestor chain, and nothing on the write side derives that chain today — so a product created through this form gets a single slug and is unreachable from every ancestor page.",
    expectedUiState:
      "The category is offered after a reload and the product's public page links it. Record how many category links the product shows: ONE, where the chosen category has ancestors, is the known gap this case is here to make visible rather than a surprise.",
    expectedData: { categoryLinksShown: 1 },
    endResult:
      "The product and the category are deleted by the final step. If only one link appears, report it — the ancestor chain being seed-only is a documented outstanding follow-up.",
  },
  "checklist-selling-seller-catalog-org-seller-category-inline-create-duplicate-rejected": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and open the category picker.",
      "Use the create control and type the name of a category that already exists — Beyblade Burst.",
      "Save and read the message.",
      "Open the picker and search that name, counting the matching options.",
      "Try again with a case variant: beyblade BURST.",
    ],
    inputs: { existingCategory: "Beyblade Burst", caseVariant: "beyblade BURST" },
    expectedBehaviour:
      "A duplicate category is refused. Categories are matched by id on the read side rather than by name, so a duplicate is less immediately destructive than a duplicate brand — but it splits a seller's own catalogue across two near-identical entries with no way to merge them.",
    expectedUiState:
      "Both attempts are refused with a readable message, and exactly one option matches the name in the picker.",
    expectedData: { matchingOptionCount: 1 },
    endResult: "Leave the editor without saving.",
  },
};
