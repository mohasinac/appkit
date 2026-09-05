/*
 * WHY: Authored six-part procedures for the content-discovery/category-brand-relations page.
 * WHAT: 8 case(s), keyed by full checklist id.
 *
 * 🛑 THE TWO SIDES OF THE TREE ARE ASYMMETRIC AND THAT ASYMMETRY IS THE POINT.
 *
 * A PRODUCT carries its full ancestor chain, so a category page matches on its own
 * id alone. A STORE carries a single category with no chain, so the store side
 * genuinely needs the descendant list. Reversing either is a real defect that
 * renders as an empty grid: expanding a root into every descendant blows the
 * query's value cap and the throw is swallowed, while NOT expanding the store side
 * hides every store filed below the top tier.
 *
 * Brands are rows in the same collection as categories, discriminated by a type
 * field, and they match products by DISPLAY NAME rather than by id — so renaming a
 * brand silently orphans its catalogue while the page keeps rendering.
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
  "checklist-content-discovery-category-brand-relations-tier-depth-reachable": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories and find Spinning Tops.",
      "Click into it and read the child categories listed.",
      "Click Beyblade Burst and read its children.",
      "Click Burst Parts and read its children.",
      "Click one of those and note there are no further children.",
      "Count how many clicks it took to reach the leaf.",
    ],
    expectedBehaviour:
      "Every tier is reachable by clicking, with no typed URLs. A tier that renders but offers no way down is unreachable in practice, which is the same as not existing for anyone browsing.",
    expectedUiState:
      "Four levels: Spinning Tops, then Beyblade Burst, then Burst Parts, then a leaf such as Layers or Drivers. Each page lists its own children until the leaf, which lists none.",
    expectedData: { tiersReached: 4 },
    endResult: "Read-only.",
  },
  "checklist-content-discovery-category-brand-relations-second-root-reachable": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories and read every top-level category shown.",
      "Check both Spinning Tops and Living Collectibles are present.",
      "Click Living Collectibles and read its children.",
      "Click down to a leaf under it.",
      "Check the leaf lists at least one live-item listing.",
    ],
    inputs: { rootA: "category-spinning-tops", rootB: "category-living-collectibles" },
    expectedBehaviour:
      "Both roots are on the index. The tree had one root and two tiers before it was rebuilt, so the live-item listings carried no category at all and were unreachable from every category and brand page — a whole listing type invisible to browsing while its detail pages worked fine.",
    expectedUiState:
      "Two roots on the index, and the Living Collectibles branch walks down to a leaf holding a live listing. One root, or a second root that leads nowhere, is the finding.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-category-brand-relations-root-page-shows-descendant-products": {
    roles: ["guest"],
    startPage: "/categories/category-spinning-tops",
    steps: [
      "Open /categories/category-beyblade-burst and note the title of one product listed there.",
      "Open /categories/category-spinning-tops.",
      "Search the listing for that same product.",
      "Read the product count shown on the root page.",
      "Compare it against the counts on its four generation children.",
    ],
    inputs: { rootId: "category-spinning-tops", childId: "category-beyblade-burst" },
    expectedBehaviour:
      "A product carries its FULL ancestor chain, so a root page matches on its own id and needs no descendant expansion. A product visible on a leaf but missing from its root means the chain was not written on the product side — and nothing appends ancestors on write today, so a listing created through the seller form has a single-element chain and is invisible on every ancestor page.",
    expectedUiState:
      "The product from the child page also appears on the root page, and the root's count is at least the sum of its children's. A root showing only its own directly-tagged products — normally none — is the finding.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-category-brand-relations-root-page-not-blank-on-large-tree": {
    roles: ["guest"],
    startPage: "/categories/category-spinning-tops",
    steps: [
      "Open /categories/category-spinning-tops with the browser console open.",
      "Read whether the product grid renders rows or is empty.",
      "Read the console for any error.",
      "Read the network panel for any failed request.",
      "Change the sort and read the grid again.",
      "Page forward once and read it again.",
    ],
    inputs: { rootId: "category-spinning-tops" },
    expectedBehaviour:
      "The root page renders products. Expanding a root into itself plus every descendant on a fifty-node tree exceeds the query's value cap, the query throws, and every caller wraps that fetch so the failure resolves to nothing — a blank grid with no error in the console, no failed request, and nothing to point at.",
    expectedUiState:
      "Rows render on the default view and after a sort change and a page forward, with a clean console. A blank grid is the finding precisely BECAUSE nothing else signals it.",
    expectedData: { consoleErrors: 0 },
    endResult: "Read-only.",
  },
  "checklist-content-discovery-category-brand-relations-mid-tier-scopes-to-own-subtree": {
    roles: ["guest"],
    startPage: "/categories/category-beyblade-burst",
    steps: [
      "Open /categories/category-spinning-tops and note its product count.",
      "Open /categories/category-beyblade-burst and note its count.",
      "Compare the two.",
      "Open /categories/category-beyblade-metal and note the title of a product listed there.",
      "Search for it on the Beyblade Burst page.",
    ],
    inputs: { parentId: "category-spinning-tops", childId: "category-beyblade-burst" },
    expectedBehaviour:
      "A mid-tier category shows its own subtree only. Equal counts on parent and child mean the scoping is not being applied at all — which reads as a working page right up until somebody notices a Metal Fight product on the Burst page.",
    expectedUiState:
      "The child's count is strictly smaller than the parent's, and no Metal Fight product appears on the Burst page. Equal counts, or a sibling's product appearing, are both findings.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-category-brand-relations-store-under-deep-category-visible-at-root": {
    roles: ["guest"],
    startPage: "/categories/category-spinning-tops",
    steps: [
      "Open /categories/category-spinning-tops and open its Stores tab.",
      "Read every store listed.",
      "Open a deeper category under the same root and open its Stores tab.",
      "Read the stores listed there.",
      "Check every store from the deeper page also appears on the root's tab.",
    ],
    inputs: { rootId: "category-spinning-tops" },
    expectedBehaviour:
      "A store carries a SINGLE category with no ancestor chain, so the store side genuinely does need the descendant list — the opposite of the product side. It expanded direct children only, so a store filed three tiers down was invisible on its root while its products were not, which is why the two sides look inconsistent when this breaks.",
    expectedUiState:
      "Every store on a descendant category's Stores tab also appears on the root's. A store visible deep and absent at the root is the finding, named.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-category-brand-relations-brand-page-lists-its-products": {
    roles: ["guest"],
    startPage: "/brands/brand-takara-tomy",
    steps: [
      "Open /brands/brand-takara-tomy and read the brand name in the hero.",
      "Read the products listed and count them.",
      "Open one of those products and read the brand named on its detail page.",
      "Compare that string against the brand page's name, character for character.",
      "Repeat on /brands/brand-beyblade.",
    ],
    inputs: { brandId: "brand-takara-tomy" },
    expectedBehaviour:
      "Products are matched to a brand by its DISPLAY NAME, not its id. The two strings must agree exactly, so renaming a brand orphans its entire catalogue — and the page still renders its hero, its editorial panels and an empty grid, with nothing anywhere reporting that a rename caused it.",
    expectedUiState:
      "Both brand pages list products, and each listed product's own detail page names the same brand string as the page's title. An empty grid on a brand with known products is the finding.",
    endResult: "Read-only.",
  },
  "checklist-content-discovery-category-brand-relations-brand-and-category-are-one-collection": {
    roles: ["guest"],
    startPage: "/brands/brand-takara-tomy",
    steps: [
      "Open /brands/brand-takara-tomy and read every panel on the page.",
      "Note whether an About-this-brand panel with website, country and founding year is present.",
      "Open /categories/category-beyblade-burst and read every panel there.",
      "Check no About-this-brand panel appears on the category page.",
      "Check both pages render their highlights and questions sections, or neither if both are unset.",
    ],
    inputs: { brandId: "brand-takara-tomy", categoryId: "category-beyblade-burst" },
    expectedBehaviour:
      "A brand and a category are rows in ONE collection distinguished by a type field, so the only thing keeping their pages apart is that each renders the fields belonging to its own kind. Brand-only fields were seeded and accepted by the interface for a long time while nothing rendered them anywhere.",
    expectedUiState:
      "The brand page shows website, country and founding year; the category page shows none of them and shows no empty labelled slots for them either.",
    endResult: "Read-only.",
  },
};
