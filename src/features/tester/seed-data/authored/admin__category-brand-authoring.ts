/*
 * WHY: Authored six-part procedures for the admin/category-brand-authoring page.
 * WHAT: 8 case(s), keyed by full checklist id.
 *
 * The WRITE side of the tree. Its read side is content-discovery/category-brand-relations;
 * these are the operations that can corrupt what that page then renders.
 *
 * 🛑 ONE OF THESE IS A KNOWN OPEN GAP RATHER THAN A REGRESSION. Nothing on the
 * write path derives a product's ancestor chain from the category it was filed
 * under — the convention is maintained by hand in the seed. So a seller picking a
 * tier-3 category through the form today produces a one-element chain and a
 * product invisible on every ancestor page. The case says so and asks for what
 * actually happens, because a case that assumes the answer teaches nothing.
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
  "checklist-admin-category-brand-authoring-create-child-under-parent": {
    roles: ["admin"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/categories and create a category named 'QA Child Burst Layers'.",
      "Pick Burst Parts as its parent.",
      "Save it.",
      "Open /categories/category-burst-parts on the public site and read its children.",
      "Click down into the new category and read the path shown.",
      "Delete the category afterwards.",
    ],
    inputs: { name: "QA Child Burst Layers", parentId: "category-burst-parts" },
    expectedBehaviour:
      "Picking a parent files the category at that parent's depth plus one and makes it appear beneath it publicly. Depth and lineage are computed from the parent — there is nothing else for the author to get right.",
    expectedUiState:
      "The new category is listed as a child of Burst Parts on the public tree and its breadcrumb reads Spinning Tops, Beyblade Burst, Burst Parts, then itself.",
    endResult: "The QA category is deleted.",
  },
  "checklist-admin-category-brand-authoring-structural-fields-derived-not-typed": {
    roles: ["admin"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/categories and start creating a category.",
      "Read every field the form offers.",
      "Check there is no input for tier, path, ancestors, children, position or subtree size.",
      "Check the only structural input is the parent picker.",
      "Open an existing deep category for edit and read the same.",
    ],
    expectedBehaviour:
      "Every structural field is derived from the parent. Exposing one lets an author write a tier that disagrees with the parent they picked, and the tree is then internally inconsistent in a way no page reports — a category can appear at one depth in the breadcrumb and a different one in the listing.",
    expectedUiState:
      "The create and edit forms both offer a parent picker and no structural field. Any such input is the finding, named.",
    endResult: "Nothing is saved.",
  },
  "checklist-admin-category-brand-authoring-reparent-moves-whole-subtree": {
    roles: ["admin"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Note that Burst Parts sits under Beyblade Burst and note its own children.",
      "Edit Burst Parts and change its parent to Beyblade X.",
      "Save and open /categories/category-beyblade-x publicly.",
      "Check Burst Parts is listed there and click into it.",
      "Check its children are still present and still reachable.",
      "Restore its parent to Beyblade Burst.",
    ],
    inputs: { categoryId: "category-burst-parts", newParentId: "category-beyblade-x" },
    expectedBehaviour:
      "Re-parenting carries the whole subtree. A move that updates only the moved row leaves its descendants pointing at a lineage that no longer describes them — they are still in the collection and reachable by direct URL, and absent from every page that walks the tree.",
    expectedUiState:
      "Burst Parts appears under Beyblade X with all its children intact and clickable. A child that 404s or vanishes from the tree is the finding.",
    endResult: "The original parent is restored.",
  },
  "checklist-admin-category-brand-authoring-product-created-with-deep-category-visible-at-root": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Create a product named 'QA Ancestor Chain Probe' priced at 499 and file it under Burst Parts.",
      "Publish it.",
      "Open /categories/category-burst-parts publicly and check the product is listed.",
      "Open /categories/category-beyblade-burst and search for it.",
      "Open /categories/category-spinning-tops and search for it.",
      "Record on which of the three pages it appears.",
      "Delete the product afterwards.",
    ],
    inputs: { title: "QA Ancestor Chain Probe", price: 499, categoryId: "category-burst-parts" },
    expectedBehaviour:
      "A category page matches on its own id alone, which only works if the product carries its full ancestor chain — and nothing on the write path derives that chain today. So a product created here is expected to be visible on Burst Parts and NOT on its ancestors. That is a known open gap, not a fresh regression, and the value of the case is the exact answer rather than the verdict.",
    expectedUiState:
      "Record exactly which of the three category pages list the product. Visible on all three means the chain is now derived on write and the gap is closed; visible only on Burst Parts is today's expected state.",
    expectedData: { categoryPagesListingIt: 1 },
    endResult: "The QA product is deleted.",
    needsReview: true,
    reviewNote:
      "Open gap by design — the write side does not append ancestors. The case exists to measure it, and its answer should change once that lands.",
  },
  "checklist-admin-category-brand-authoring-brand-rename-orphan-check": {
    roles: ["admin"],
    startPage: "/admin/brands",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /brands/brand-takara-tomy publicly and count the products listed.",
      "Open /admin/brands, edit Takara-Tomy, and change its name to 'Takara Tomy QA'.",
      "Save it.",
      "Reload /brands/brand-takara-tomy and count the products again.",
      "Read whether any warning was shown at save time about products that would be affected.",
      "Restore the name to 'Takara-Tomy' and reload once more.",
    ],
    inputs: { brandId: "brand-takara-tomy", renamedTo: "Takara Tomy QA" },
    expectedBehaviour:
      "Products are matched to a brand by its display name, so a rename either carries the products with it or warns that it will not. Neither happening is the failure this case is for: the page renders its hero and its editorial panels perfectly over an empty grid, and nothing anywhere connects that to the rename.",
    expectedUiState:
      "After the rename the brand page lists the same products, or the save warned first. An empty grid with no warning is the finding, with the before and after counts.",
    endResult: "The brand name is restored and the products are listed again.",
  },
  "checklist-admin-category-brand-authoring-brand-cover-image-is-the-hero": {
    roles: ["admin"],
    startPage: "/admin/brands",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/brands and edit Hasbro.",
      "Read every image field the form offers and note each one's label.",
      "Upload /test-media/sample-image.png into the field labelled as the cover image.",
      "Save and open /brands/brand-hasbro publicly.",
      "Check the uploaded image is what renders as the page's hero banner.",
      "If the form offers a second image field, upload a distinguishable image there and check whether anything renders it.",
    ],
    inputs: { brandId: "brand-hasbro", imagePath: "/test-media/sample-image.png" },
    expectedBehaviour:
      "The field labelled as the cover image is the one the hero renders. A form once had a Logo input and a Banner input side by side where Logo wrote the hero's field and Banner wrote a field with no readers at all — so the labels described the reverse of reality and every uploaded banner was discarded silently.",
    expectedUiState:
      "The image uploaded into the cover field is the hero on the public page. A second image field whose upload appears nowhere is a finding — that field has no reader.",
    endResult: "The brand carries the uploaded cover image.",
  },
  "checklist-admin-category-brand-authoring-category-type-not-guessable": {
    roles: ["admin"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/categories and start creating a category.",
      "Find where the row's kind is chosen and read the options offered.",
      "Check the options match the kinds the site actually renders — a listing category, a brand, a sub-listing group and a bundle.",
      "Check no option is offered that no page renders.",
      "Save nothing and open an existing brand row for edit, checking its kind is shown.",
    ],
    expectedBehaviour:
      "Brands, bundles, sub-listing groups and ordinary categories are all rows in one collection distinguished by a kind field, so the author has to be able to see and set it. An option offered that no page renders creates rows nothing will ever display.",
    expectedUiState:
      "The kind is an explicit, readable choice on create and visible on edit, and every option corresponds to a kind the site renders.",
    endResult: "Nothing is saved.",
  },
  "checklist-admin-category-brand-authoring-delete-category-with-children-refused": {
    roles: ["admin"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/categories and attempt to delete Beyblade Burst, which has children and products beneath it.",
      "Read the confirmation or refusal.",
      "Check the message names how many children or products depend on it.",
      "If it refuses, cancel and confirm the category is untouched.",
      "If it succeeds, open the public categories tree and record what happened to its children.",
    ],
    inputs: { categoryId: "category-beyblade-burst" },
    expectedBehaviour:
      "A delete that orphans a subtree is unrecoverable, so it is refused with a count of what depends on it. Deletes are the one operation whose bug cannot be undone, which is why the refusal has to be structural rather than a warning the admin can click past.",
    expectedUiState:
      "The delete is refused with a message naming the dependent children and products. If it succeeds instead, that is the finding and the state of the orphaned subtree is the evidence.",
    endResult:
      "The category still exists. If the delete succeeded, re-seed rather than attempting a manual repair.",
  },
};
