/*
 * WHY: Authored six-part procedures for selling/listing-edit-roundtrip.
 * WHAT: 6 cases, keyed by full checklist id.
 *
 * 🛑 THE UPDATE PATH HAD NO CASES AT ALL. `/store/products/new` carries 57; the
 * editors carried zero — and the editors are where the 2026-09-14 data-loss bug
 * lived (Root Cause #98). Nine of them spread an `ActionResult` envelope as if
 * it were the product, so `notFound()` could never fire, every field resolved
 * `undefined`, and `status === "published" ? … : "draft"` evaluated
 * `undefined === "published"` — meaning **pressing Save wrote draft over a live
 * listing** and removed it from every public surface.
 *
 * Every case below is written so it FAILS against that behaviour. A case reading
 * "editing a listing works" passes on a blank form that destroys the record.
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
  "checklist-selling-listing-edit-roundtrip-edit-opens-populated": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and find a listing whose status reads Published.",
      "Write down its title, its price and its stock quantity from the row.",
      "Open that listing's Edit action.",
      "Wait for the form to finish loading.",
      "Read the Title, Price and Stock fields.",
    ],
    expectedBehaviour:
      "The editor is seeded from the listing's stored document. A blank form means the page received something other than a product — an ActionResult envelope spreads to all-undefined and renders exactly this way, with no error.",
    expectedUiState:
      "Title, Price and Stock each hold the values written down from the row. No field that had a value on the row is empty here.",
    expectedData: { emptyRequiredFieldCount: 0 },
    endResult:
      "Nothing is saved; the form was only opened. Leaving without saving must not change the listing.",
  },

  "checklist-selling-listing-edit-roundtrip-edit-category-preselected": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and pick any published listing.",
      "Open its public page in a second tab and read which category it is filed under.",
      "Return to the first tab and open the listing's Edit action.",
      "Find the Category selector and read what it currently shows.",
    ],
    expectedBehaviour:
      "The selector is seeded from the listing's stored category. The stored field is `categorySlugs[]` and its FIRST entry is the leaf; a form reading a singular `categorySlug` gets undefined and opens blank — and then saving that blank submits it.",
    expectedUiState:
      "The Category selector shows the same category name the public page showed — for example Original Plastic Gen. It is not empty and is not sitting on its unchosen placeholder.",
    endResult:
      "Nothing is saved. If this case fails, do NOT press Save — saving a blank category is the damage it is warning about.",
  },

  "checklist-selling-listing-edit-roundtrip-edit-save-keeps-published": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and find a listing whose status reads Published. Write down its title.",
      "Open its Edit action.",
      "Change only the Description — append the word roundtrip to it.",
      "Press Save.",
      "Return to /store/products and reload the page.",
      "Find the same listing and read its status.",
      "Open its public detail page.",
    ],
    inputs: { descriptionSuffix: "roundtrip" },
    expectedBehaviour:
      "Editing one field changes that field and nothing else. The status must survive the round trip: an editor that read the status as undefined will coerce it to draft on save, which silently unpublishes a live listing.",
    expectedUiState:
      "After the reload the row still reads Published, and the public detail page still loads rather than 404ing.",
    expectedData: { statusAfterSave: "published" },
    endResult:
      "The description keeps the appended word after a reload, and the listing is still published and still publicly reachable.",
  },

  "checklist-selling-listing-edit-roundtrip-edit-missing-id-404s": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Navigate directly to /store/products/zzzznope-not-a-listing-42/edit — a deliberately invented id, not a fixture.",
      "Read what the page shows.",
    ],
    inputs: { listingId: "zzzznope-not-a-listing-42" },
    expectedBehaviour:
      "An id that resolves to no listing must 404. A blank editor here is the tell that the page never checked: an always-truthy envelope makes the not-found branch unreachable, and the empty form it renders is indistinguishable from a real listing with no data.",
    expectedUiState:
      "A not-found page. NOT an empty product form, and not a form with a Save button on it.",
    expectedData: { showsEditForm: false },
    endResult: "Nothing is created or saved.",
  },

  "checklist-selling-listing-edit-roundtrip-edit-other-sellers-listing-404s": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as the bot seller claude-tester@letitrip.in / TempPass123! (its store is empty).",
      "In a second tab open /products and copy the slug of any listing belonging to Beyblade Arena.",
      "Back in the first tab, navigate to /store/products/<that slug>/edit.",
      "Read what the page shows.",
    ],
    expectedBehaviour:
      "Ownership is checked against the caller's STORE, and a product's `storeId` is the store SLUG rather than the owner's Auth uid. A check comparing `storeId` to a uid compares two different namespaces and can never pass — which returns null for every legitimate seller too, so a page that 404s here must be verified to still open the seller's OWN listing.",
    expectedUiState: "A not-found page, with no editable fields.",
    expectedData: { showsEditForm: false },
    endResult:
      "Nothing is changed on the other seller's listing. Then re-open one of your own listings to confirm the guard has not locked everyone out.",
  },

  "checklist-selling-listing-edit-roundtrip-edit-ancestor-pages-after-recategorise": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /categories/original-plastic-gen — a tier-3 category whose parent is original-tops and whose root is spinning-tops.",
      "Open /store/products, pick a published listing, and open its Edit action.",
      "Change its Category to Original Plastic Gen and press Save.",
      "Open /categories/original-plastic-gen and look for the listing.",
      "Open /categories/original-tops and look for the same listing.",
      "Open /categories/spinning-tops and look for it again.",
    ],
    expectedBehaviour:
      "A product stores the FULL ancestor chain, so it is reachable from its own category and from every ancestor with one query. If only the leaf is stored, the ancestor pages match nothing — and the leaf page can fail too, because the stored field and the field the form sends are not the same one.",
    expectedUiState:
      "The listing's card appears on all three pages: the deep category, its parent, and its root.",
    expectedData: { visibleOnLeaf: true, visibleOnParent: true, visibleOnRoot: true },
    endResult:
      "After a reload the listing is still filed under the deep category and still appears on all three pages.",
  },
};
