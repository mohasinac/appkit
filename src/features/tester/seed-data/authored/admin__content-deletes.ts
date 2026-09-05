/*
 * WHY: Authored six-part procedures for the admin/content-deletes page.
 * WHAT: 14 case(s), keyed by full checklist id.
 *
 * 🛑 A DELETE IS THE ONE OPERATION WHOSE BUG CANNOT BE UNDONE, AND BEFORE THIS PAGE
 * THE WHOLE CATALOGUE HELD THREE CASES THAT TESTED ONE. Creates and edits were
 * covered thoroughly; the operation that destroys data was not, which is exactly
 * backwards.
 *
 * Every case here deletes something it created, or restores what it changed. Where
 * that is not possible — a seeded record with dependents — the case checks the
 * REFUSAL rather than performing the delete.
 *
 * Two distinctions run through the page: disable is not delete, and unpublish is
 * not delete. A screen that blurs either invites an admin to reach for the
 * irreversible one when they wanted the reversible one.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const SIGN_IN_ADMIN = "Sign in as admin@letitrip.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-admin-content-deletes-homepage-section-edit-persists": {
    roles: ["admin"],
    startPage: "/admin/sections",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/sections and open a section for edit.",
      "Change its heading to 'QA Section Heading Probe' and save.",
      "Reload the admin page and read the heading.",
      "Open the public homepage and find that section.",
      "Read its heading there.",
      "Restore the original heading.",
    ],
    inputs: { heading: "QA Section Heading Probe" },
    expectedBehaviour:
      "An edit persists and the public page follows. A handler that validates a body, returns success and never calls a write is the failure this checks for — the response echoes the submission back, so it is indistinguishable from a real save without a reload.",
    expectedUiState:
      "The new heading is on the admin page after the reload and on the public homepage. A value that reverts is the finding despite the success message.",
    endResult: "The original heading is restored.",
  },
  "checklist-admin-content-deletes-homepage-section-delete": {
    roles: ["admin"],
    startPage: "/admin/sections",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/sections and note the full order of sections.",
      "Create a new section so the delete has a disposable target.",
      "Note where it sits in the order.",
      "Delete it and confirm.",
      "Read the remaining sections and their order.",
      "Open the public homepage and check the order matches and no gap is left.",
    ],
    expectedBehaviour:
      "Deleting a section removes it and leaves the rest in order. Ordering keyed on array position rather than on a stored order value shifts every later section by one on a delete, so the page silently reorders itself.",
    expectedUiState:
      "The section is gone from both the admin list and the homepage, with the remaining sections in their original relative order and no empty band where it was.",
    endResult: "Only the section this case created is gone.",
  },
  "checklist-admin-content-deletes-homepage-section-reorder": {
    roles: ["admin"],
    startPage: "/admin/sections",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/sections and write down the current order of the first four sections.",
      "Move the third section above the first.",
      "Save if a save is required.",
      "Reload and read the order.",
      "Open the public homepage and read the order there.",
      "Restore the original order.",
    ],
    expectedBehaviour:
      "A reorder persists and the public page follows it. A reorder that holds in the admin list and not publicly means the order is being stored somewhere the public read does not consult.",
    expectedUiState:
      "The new order survives the reload and matches on the public homepage. Agreement between the two is what makes the reorder real.",
    endResult: "The original order is restored.",
  },
  "checklist-admin-content-deletes-homepage-section-disable-vs-delete": {
    roles: ["admin"],
    startPage: "/admin/sections",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/sections and disable a section rather than deleting it.",
      "Open the public homepage and check the section is gone from it.",
      "Return to the admin page and check the section is still listed, marked as disabled.",
      "Re-enable it and check it returns publicly.",
      "Read the two controls side by side and check which is which is obvious without trying them.",
      "Check the delete control carries a confirmation and the disable control does not need one.",
    ],
    expectedBehaviour:
      "Disable hides a section reversibly; delete removes it permanently. The two must be visually distinct, because an admin wanting to hide a section for a week and reaching for the wrong one loses its whole configuration.",
    expectedUiState:
      "A disabled section is absent publicly and still present, marked, in the admin list. The destructive control is visually distinct and confirms; the reversible one does not.",
    endResult: "The section is re-enabled.",
  },
  "checklist-admin-content-deletes-carousel-slide-edit-persists": {
    roles: ["admin"],
    startPage: "/admin/carousel",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/carousel and open a slide for edit.",
      "Change its title to 'QA Slide Title Probe' and change its autoplay delay.",
      "Save.",
      "Reload the admin page and read both values.",
      "Open the public homepage and watch the carousel reach that slide.",
      "Restore both original values.",
    ],
    inputs: { title: "QA Slide Title Probe" },
    expectedBehaviour:
      "Both the content and the settings persist and reach the homepage. Settings are the half more likely to be dropped, because nothing on the admin screen shows whether an autoplay delay was actually written.",
    expectedUiState:
      "Both values survive the reload and the homepage carousel reflects them. A title that saved while the delay reverted is the finding.",
    endResult: "The original title and delay are restored.",
  },
  "checklist-admin-content-deletes-carousel-slide-delete": {
    roles: ["admin"],
    startPage: "/admin/carousel",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/carousel and create a slide titled 'QA Disposable Slide' so the delete has a safe target.",
      "Activate it and check it appears on the homepage rotation.",
      "Delete it and confirm.",
      "Reload the admin list and check it is gone.",
      "Open the public homepage and watch a full rotation.",
      "Check the remaining slides still advance on their own.",
    ],
    inputs: { title: "QA Disposable Slide" },
    expectedBehaviour:
      "Deleting a slide removes it from the rotation and the rest keep autoplaying. A rotation driven by an index into the old list stalls or throws on the removed position, and the carousel then simply stops — which reads as a design choice rather than a failure.",
    expectedUiState:
      "The slide is gone from the admin list and from the rotation, and the remaining slides advance automatically through a full cycle.",
    endResult: "Only the disposable slide is gone.",
  },
  "checklist-admin-content-deletes-carousel-active-limit-enforced": {
    roles: ["admin"],
    startPage: "/admin/carousel",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/carousel and count how many slides are currently active.",
      "Read whether the page states a maximum.",
      "Activate slides until you exceed that maximum.",
      "Read what happens on the attempt that would exceed it.",
      "Open the homepage and count the slides in the rotation.",
      "Restore the original active set.",
    ],
    expectedBehaviour:
      "Exceeding the active-slide maximum is refused with a reason. Silently accepting the extra slide and then rendering only the first few is worse than refusing — the admin sees their slide saved and never learns it is not being shown.",
    expectedUiState:
      "The attempt is refused with a message naming the maximum, and the homepage's rotation count matches the active count. A saved-but-not-rendered slide is the finding.",
    endResult: "The original active set is restored.",
  },
  "checklist-admin-content-deletes-blog-edit-persists": {
    roles: ["admin"],
    startPage: "/admin/blog",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/blog and open a published post for edit.",
      "Change its title to 'QA Blog Title Probe', edit a sentence of its body, and replace its cover image with /test-media/sample-image.png.",
      "Save.",
      "Reload the admin editor and check all three changes are there.",
      "Open the post's public page and check all three again.",
      "Restore the original title, sentence and cover image.",
    ],
    inputs: { title: "QA Blog Title Probe", coverImage: "/test-media/sample-image.png" },
    expectedBehaviour:
      "All three kinds of change persist together — a scalar field, rich body content and a media reference. Media is the one most often dropped on update: a create path that finalises a newly-uploaded file while the update path does not leaves the image in temporary storage, so it renders once and disappears later.",
    expectedUiState:
      "Title, body and cover image all changed on both the editor and the public page. An image that renders immediately and is broken after a reload is the finalise failure.",
    endResult: "All three original values are restored.",
  },
  "checklist-admin-content-deletes-blog-delete-removes-public-page": {
    roles: ["admin"],
    startPage: "/admin/blog",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/blog and create a post titled 'QA Disposable Post', publish it.",
      "Open its public page and note the URL.",
      "Return to /admin/blog and delete it, confirming.",
      "Reload the public URL with the network panel open.",
      "Read the response status.",
      "Open /blog and check the post is gone from the list.",
    ],
    inputs: { title: "QA Disposable Post" },
    expectedBehaviour:
      "A deleted post's URL returns 404. A 200 carrying an empty article keeps the URL in search indexes indefinitely and shows visitors a page that looks broken rather than gone.",
    expectedUiState:
      "The public URL returns 404 with a readable not-found page, and the post is absent from the blog list. A 200 with an empty article is the finding.",
    expectedData: { statusCode: 404 },
    endResult: "Only the disposable post is gone.",
  },
  "checklist-admin-content-deletes-blog-unpublish-vs-delete": {
    roles: ["admin"],
    startPage: "/admin/blog",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/blog and unpublish a post rather than deleting it.",
      "Open /blog publicly and check it is absent from the list.",
      "Open its public URL directly as a signed-out visitor and read what happens.",
      "Return to /admin/blog and check the post is still listed and still editable.",
      "Republish it and check it returns to the public list.",
      "Read the two controls and check delete is visually distinct from unpublish.",
    ],
    expectedBehaviour:
      "Unpublishing hides a post reversibly and keeps it editable; deleting removes it. The controls have to look different, because the reversible and the irreversible action sit next to each other in the same menu.",
    expectedUiState:
      "The unpublished post is absent publicly, still present and editable in admin, and returns on republish. The delete control is visually distinct and confirms.",
    endResult: "The post is republished.",
  },
  "checklist-admin-content-deletes-listing-delete-removes-public-page": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Create a product titled 'QA Disposable Listing' priced at 299 and publish it.",
      "Open its public detail page and note the URL, and find it in /products.",
      "Return to /admin/products and delete it, confirming.",
      "Reload the public URL with the network panel open and read the status.",
      "Open /products and search for it.",
      "Open the search page and search for it there too.",
    ],
    inputs: { title: "QA Disposable Listing", price: 299 },
    expectedBehaviour:
      "A deleted listing leaves every grid it appeared in, not only its own page. Search is the one most likely to lag, because its index is written on save — a listing removed from the collection but left in the index renders a result card that 404s when clicked.",
    expectedUiState:
      "The detail URL returns 404 and the listing is absent from both the catalogue grid and search results. A search result that leads to a 404 is the finding.",
    expectedData: { statusCode: 404 },
    endResult: "Only the disposable listing is gone.",
  },
  "checklist-admin-content-deletes-listing-delete-with-orders-refused-or-archived": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/orders and find an order, noting one product it contains.",
      "Open /admin/products and attempt to delete that product.",
      "Read whether the interface refuses, warns, or deletes.",
      "If it deletes, open that order and read whether its rows still render.",
      "Click the product link on the order's row and read where it lands.",
      "Record which of the three behaviours occurred.",
    ],
    expectedBehaviour:
      "An order's rows denormalise the title, price and image they display, so an existing order survives the product's deletion — but the buyer's link into that product breaks. Either outcome can be defensible; what matters is that it is deliberate and stated rather than discovered by a buyer opening an old order.",
    expectedUiState:
      "Record exactly what happened: a refusal naming the orders, an archive instead of a delete, or a hard delete. If it deleted, record whether the order still renders and where its product link goes.",
    endResult:
      "If a product was hard-deleted, re-seed rather than attempting a manual repair.",
    needsReview: true,
    reviewNote:
      "The intended behaviour is not settled. The case exists to record which of refuse / archive / hard-delete actually happens, and what it does to an existing order.",
  },
  "checklist-admin-content-deletes-delete-confirmations-name-the-record": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and trigger a delete on a specific row.",
      "Read the confirmation dialog WITHOUT confirming, and note whether it names that record.",
      "Cancel.",
      "Repeat on /admin/blog, /admin/carousel and /admin/categories.",
      "Record any confirmation that says only 'this item' or 'are you sure'.",
    ],
    expectedBehaviour:
      "A delete confirmation names the record it will remove. A generic prompt gives an admin nothing to check against — the most common delete mistake is the right action on the wrong row, and only the name catches it.",
    expectedUiState:
      "Each confirmation quotes the record's title or id. A generic prompt is a finding, named by surface.",
    endResult: "Nothing is deleted.",
  },
  "checklist-admin-content-deletes-delete-reflected-immediately": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Create a product titled 'QA Delete Refresh Probe' priced at 199.",
      "Delete it from the list and confirm.",
      "WITHOUT reloading, read whether the row has gone.",
      "Wait ten seconds and read the list again.",
      "Reload and read it once more.",
      "Open the list in a second tab and read it there.",
    ],
    inputs: { title: "QA Delete Refresh Probe", price: 199 },
    expectedBehaviour:
      "The row goes immediately and stays gone. A row that returns after a moment means a cached copy re-hydrated over the deletion — the delete did happen, but the screen contradicts it, which is the worst possible signal to give somebody who just deleted something.",
    expectedUiState:
      "The row is gone immediately, still gone after ten seconds, after a reload and in a second tab. A row that reappears at any point is the finding.",
    endResult: "The probe product is deleted.",
  },
};
