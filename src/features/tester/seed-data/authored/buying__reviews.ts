/*
 * WHY: Authored six-part procedures for the buying/reviews checklist page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A REVIEW'S IMAGES ARE PLAIN URL STRINGS. A renderer that expects objects and
 * reads a nested property off each string gets undefined for every one, so every
 * review photo on every surface falls back to a placeholder at once — the grid,
 * the lightbox, the thumbnail strip, the modal and two separate server-side
 * builders that each re-derived the same wrong transform independently.
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
  "checklist-buying-reviews-leave-review": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open a delivered order.",
      "Use the control that leaves a review on one of its items.",
      "Submit with no rating and no text, and read where the errors appear.",
      "Select 4 stars, type 'QA Review leave-review' as the title and 'Written by the tester checklist.' as the body, and attach public/test-media/sample-image.png.",
      "Submit and RELOAD.",
      "Open the product's public page and find the review.",
      "Read whether it carries a verified-purchase marker.",
    ],
    inputs: {
      rating: 4,
      title: "QA Review leave-review",
      body: "Written by the tester checklist.",
      image: "public/test-media/sample-image.png",
    },
    expectedBehaviour:
      "A review is written against the product, the store and the buyer, and is marked as a verified purchase because it came from a delivered order. The attached image is stored as a plain URL string rather than an object — that is the shape every renderer must read.",
    expectedUiState:
      "The empty submit marks the rating and body fields individually. After the reload the review appears on the public product page with its stars, title, body, photo and a verified-purchase marker. The photo RENDERS rather than showing a placeholder icon.",
    endResult:
      "One review exists. Delete it afterwards so the seeded product's review count and rating are left as they were.",
  },
  "checklist-buying-reviews-view-seller-reviews": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open /stores/store-beyblade-arena in a private window with no session.",
      "Open the store's reviews tab and read the rows.",
      "Check each shows a rating, a title, a body and a date.",
      "Read how each reviewer is identified.",
      "Search the page source for a full reviewer name or an email address.",
      "Read the store's aggregate rating and compare it against the reviews listed.",
    ],
    expectedBehaviour:
      "The public reviews list shows masked reviewer identities. Names are PII-encrypted at rest, so what reaches this page is a masked form — and a masking helper that returns its input unchanged is invisible from every layer except this one, which is why the source is read rather than the rendered text alone.",
    expectedUiState:
      "Reviews show rating, title, body and date with masked reviewer names. Neither the rendered page nor its source contains a full name or an email. The aggregate rating is consistent with the reviews shown.",
    expectedData: { fullNamesInSource: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-seller-response": {
    roles: ["seller", "guest"],
    startPage: "/store/reviews",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's reviews list and open one with no seller response.",
      "Type 'QA Response seller-response — thanks for the feedback.' and save.",
      "RELOAD and read the response.",
      "Open the same review on the product's public page in a private window.",
      "Read whether the response is shown and how it is attributed.",
      "Edit the response, save, reload, and read it again.",
      "Delete the response.",
    ],
    inputs: { response: "QA Response seller-response — thanks for the feedback." },
    expectedBehaviour:
      "A seller response is stored on the review and rendered publicly, attributed to the STORE rather than to a person. It can be edited afterwards — a response writable only once leaves a typo permanent on a public page.",
    expectedUiState:
      "After the reload the response appears in the dashboard and on the public product page, attributed to Beyblade Arena. The edit persists. The reviewer's own name stays masked — a response does not unmask it.",
    endResult:
      "The response is deleted so the seeded review is left as it was.",
  },
  "checklist-buying-reviews-review-detail-related-sections": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window.",
      "Open a review's own detail view.",
      "Scroll below it and read each related section's heading.",
      "Check each section holds real reviews with titles and ratings.",
      "Check the review currently open does not appear in any of them.",
      "Click one entry and confirm it opens that review.",
    ],
    expectedBehaviour:
      "A review detail offers other reviews — of the same product and of the same store — with the current one excluded. A heading over an empty rail is worse than no section: it advertises content that is not there, and the section should not render at all when it has nothing.",
    expectedUiState:
      "Each related section holds at least one real review and the current review is in none of them. Every entry opens the review it names. An empty rail beneath a heading is the failure.",
    expectedData: { selfLinkCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-review-photos-render": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window.",
      "Find a review carrying photos and look at its photo grid.",
      "Check each tile shows a photograph rather than a placeholder icon.",
      "Click one to open the lightbox and check the image renders there.",
      "Use the lightbox's thumbnail strip and check each thumbnail shows its own image.",
      "Close it, open the review modal from the list, and check the photos render there too.",
      "Open the seller's public profile reviews and check the photos render there as well.",
    ],
    expectedBehaviour:
      "Review images are plain URL strings and every renderer reads them as such. Where a renderer expects objects it reads undefined off each string and falls back to a placeholder — which makes every review photo vanish simultaneously across five surfaces, including two independent server-side builders that each re-derived the same wrong transform.",
    expectedUiState:
      "Photos render in the grid, the lightbox, the lightbox's thumbnail strip, the review modal and the profile reviews. A placeholder icon in ANY of those is the failure, and it will be a placeholder in all of them rather than one.",
    expectedData: { placeholderTiles: 0 },
    endResult:
      "Read-only; nothing persists. Check every surface — this defect is all-or-nothing, so one working surface would mean the others are reading a different path.",
  },
};
