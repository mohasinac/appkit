/*
 * WHY: Authored six-part procedures for the selling/seller-catalog-org page.
 * WHAT: 8 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THREE DIFFERENT THINGS HERE ARE ALL CALLED "CATEGORY", and conflating them is
 * how the first version of this file described the wrong object twice:
 *
 *   /store/categories            STOREFRONT shelves. Own collection
 *                                (`storeCategoriesRepository`), scoped to one
 *                                store, and the field is **Label**, not Name.
 *   /store/sublisting-categories the seller's sub-groupings, with DERIVED page
 *                                metadata that must be recomputed on rename.
 *   the product form's picker    the GLOBAL taxonomy. Its inline-create posts to
 *                                the admin categories endpoint — which admits
 *                                sellers deliberately (ROLES_STORE_WRITE, with a
 *                                comment saying it is for this picker).
 *
 * 🛑 A PRODUCT CARRIES ITS FULL ANCESTOR CHAIN so a parent category page can match
 * on its own id alone — and since 2026-09-14 that chain IS derived on write, by
 * `ProductRepository.deriveTaxonomy()`, from both `create` and `update`. This file
 * used to say the opposite and instruct the tester to REPORT a one-element chain as
 * a known gap; that is now a false bug report. `deep-category-chain-derived` is the
 * case that can actually fail if the derivation regresses.
 *
 * The inline-create form sends only name/slug/description/isActive — there is **no
 * parent field** — so a category created that way is always a root and correctly
 * shows exactly one link. One link there is arithmetic, not a defect.
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
      "Open the store's categories page and read the list. These are STOREFRONT shelves scoped to this store — not the global taxonomy the product form's category picker offers.",
      "Create one and save. The field is labelled 'Label', not 'Name' — type 'QA Shelf catalog-org' into it. Leave the slug blank, it is optional on create.",
      "RELOAD and confirm it is listed under that label.",
      "Change the Label to 'QA Shelf catalog-org renamed' WITHOUT touching the slug field, save, then RELOAD and read both the label and the slug.",
      "Delete it and RELOAD to confirm it is gone.",
    ],
    inputs: {
      label: "QA Shelf catalog-org",
      renamed: "QA Shelf catalog-org renamed",
    },
    expectedBehaviour:
      "Create, rename and delete all persist against this store. The rename is the one worth watching: slug is its own editable field here rather than something derived from the label, so editing the label alone must leave the slug exactly as it was — a slug that silently re-derives would break every link to the shelf.",
    expectedUiState:
      "Each operation survives its reload. After the rename the new label is shown and the slug is byte-identical to what it was before. A validation error naming a field the form does not show is also a failure — the create schema requires only the label.",
    endResult:
      "The shelf is deleted by the final step. Nothing in the global category taxonomy is touched by this case.",
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
      "Click the one naming QA Category inline-create and confirm the product is listed on the page it opens.",
      "Delete the product and the category afterwards.",
    ],
    inputs: {
      categoryName: "QA Category inline-create",
      title: "QA Product inline-category",
      price: 400,
    },
    expectedBehaviour:
      "The category persists across a reload and the product is genuinely filed under it — reachable from the category's own page, not merely named on the product.",
    expectedUiState:
      "The category is offered after a reload and the product's public page links it. EXACTLY ONE link is correct here and is not a defect: the inline-create form sends only name, slug, description and active — it has no parent field — so the category it makes is a root with no ancestors to list. A product under a DEEP category is a different assertion and has its own case.",
    expectedData: { categoryLinksShown: 1 },
    endResult:
      "The product and the category are deleted by the final step. Do not report the single link as a missing ancestor chain — that was this case's own stale claim and it is wrong.",
  },
  "checklist-selling-seller-catalog-org-deep-category-chain-derived": {
    roles: ["seller", "guest"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and search the category picker for 'Heavy Metal System' — a seeded tier-3 category whose ancestors are Original Tops, Beyblade Original and Spinning Tops.",
      "Select it, type 'QA Product deep-chain' as the title and 500 as the price, and publish.",
      "Open the product's public page and count the category links below the title.",
      "Read the names in order and compare them against the four expected.",
      "Open /categories/category-spinning-tops — the ROOT, three levels above the category chosen — and look for this product.",
      "Delete the product afterwards.",
    ],
    inputs: {
      categoryName: "Heavy Metal System",
      categoryId: "category-original-hms",
      title: "QA Product deep-chain",
      price: 500,
    },
    expectedBehaviour:
      "A product filed against a deep category is written with its FULL ancestor chain, so every ancestor page matches on its own id alone. The repository derives this on create and update; a form payload cannot supply it, because the create schema strips any categorySlugs it is sent. This is the assertion that fails if that derivation regresses — and the failure is silent, because the product's own page looks completely normal with one link.",
    expectedUiState:
      "FOUR category links: Heavy Metal System, Original Tops, Beyblade Original, Spinning Tops. The product appears on the root Spinning Tops page. One link, or a root page that does not list it, is the failure — and note that every SEEDED product shows four, so a new listing showing one is a write-path defect rather than a display one.",
    expectedData: { categoryLinksShown: 4, foundOnRootCategoryPage: true },
    endResult:
      "The product is deleted by the final step. Check the root page before deleting — that is the half a tester is most likely to skip, and it is the half that proves the chain is queryable rather than merely printed.",
  },
  "checklist-selling-seller-catalog-org-seller-category-inline-create-duplicate-rejected": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and open the category picker.",
      "Use the create control and type the name of a category that already exists — Beyblade Burst.",
      "Save and read the message shown on the form.",
      "Open the picker and search that name, counting the matching options.",
      "Try again with a case variant: beyblade BURST. The form derives the slug by lowercasing and hyphenating, so this collides on the SAME slug and must be refused for the same reason.",
    ],
    inputs: { existingCategory: "Beyblade Burst", caseVariant: "beyblade BURST" },
    expectedBehaviour:
      "A duplicate category is refused on its SLUG, which is what makes the case variant collide too. Categories are matched by id on the read side rather than by name, so a duplicate is less immediately destructive than a duplicate brand — but it splits a seller's own catalogue across two near-identical entries with no way to merge them.",
    expectedUiState:
      "Both attempts are refused with a readable message — the server answers 409 'A category with this slug already exists' — and exactly one option matches the name in the picker. A refusal that surfaces only as a silent no-op, or as a raw 409 with no message on the form, is a failure even though nothing was created.",
    expectedData: { matchingOptionCount: 1 },
    endResult: "Leave the editor without saving.",
  },
};
