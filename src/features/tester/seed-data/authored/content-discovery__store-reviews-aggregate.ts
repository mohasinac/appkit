/*
 * WHY: Authored six-part procedures for content-discovery/store-reviews-aggregate.
 * WHAT: 4 cases, keyed by full checklist id.
 *
 * 🛑 THIS TAB ANSWERED 200 WITH ZERO REVIEWS FOR EVERY STORE, for as long as it
 * had existed, while 79 approved reviews sat in Firestore (Root Cause #100). It
 * selected "the store's top 20 products by `itemsSold`" and fanned out a review
 * query per product — and **no product carries `itemsSold`**, so Firestore's
 * `orderBy` excluded all 95 of them and the endpoint returned nothing.
 *
 * The only symptom was "this store has no reviews yet", which reads as a fact
 * about the store. That is why the first case names a store KNOWN to have
 * reviews rather than asking whether the tab renders.
 *
 * Fixing it then exposed the next layer: the route returned the raw document,
 * including the reviewer's name as `enc:v1:…` ciphertext and the HMAC blind
 * index beside it. Hence the privacy case.
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
  "checklist-content-discovery-store-reviews-aggregate-reviews-tab-not-empty": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open /stores/store-beyblade-arena — this store is known to have many approved reviews, which is the point of naming it.",
      "Open its Reviews tab.",
      "Wait for the content to finish loading before judging it.",
      "Read how many reviews are reported and count the cards on the first page.",
    ],
    expectedBehaviour:
      "Reviews are fetched by the store they belong to. Routing the lookup through a sample of the store's products makes the result depend on a field those products may not have — and an ordering field that is absent silently excludes every document, returning an empty list rather than an error.",
    expectedUiState:
      "Review cards are listed and a total is shown. NOT 'No reviews yet' and not an empty tab.",
    expectedData: { totalReviewsAtLeast: 1 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-store-reviews-aggregate-average-matches-the-rows": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open the store's Reviews tab and write down the average rating and the total.",
      "Read the star-distribution breakdown and write down the count beside each star level.",
      "Add the five distribution counts together.",
      "Compare that sum with the total.",
      "Filter to 5-star reviews and compare the number of cards with the 5-star count from the breakdown.",
    ],
    expectedBehaviour:
      "The aggregate covers the whole store, not a sample of it. Computing it from an arbitrary subset of products leaves the average and the distribution quietly wrong — and those two numbers are what a buyer judges a seller on.",
    expectedUiState:
      "The distribution counts sum to the total, and the 5-star filter returns as many reviews as the breakdown claims.",
    expectedData: { distributionSumsToTotal: true },
    endResult: "Clearing the filter restores the full list.",
  },

  "checklist-content-discovery-store-reviews-aggregate-reviewer-name-is-masked": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open the store's Reviews tab.",
      "Read the reviewer name shown on the first three cards.",
      "Open the browser network panel and reload.",
      "Find the request that fetched the reviews and read its response body.",
      "Search that body for the text enc:v1 and for the field names userNameIndex, searchTxt and userId.",
    ],
    expectedBehaviour:
      "A reviewer's name is PII, stored encrypted, and shown masked in public. The generic repository returns the document verbatim, so a route that does not go through the reviews repository serves ciphertext — and a payload built by spreading the document also carries the HMAC blind index, which lets a caller confirm a guessed name.",
    expectedUiState:
      "Names render masked, for example 'M*** U***'. No card shows a value beginning enc:v1.",
    expectedData: { ciphertextInResponse: false, blindIndexInResponse: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-store-reviews-aggregate-review-search-matches-body-text": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open the store's Reviews tab and read one review card in full.",
      "Pick a distinctive word that appears in that review's BODY text but not in its title and not in the product name.",
      "Type that word into the reviews search box.",
      "Read the results.",
      "Clear the box and search for zzzznope.",
      "Read the results again.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Search covers the review's body. The stored field for that text is `comment`; a filter reading a differently-named field matches nothing in the body and still returns rows via the title and the product name, so it looks like a working search that is merely strict.",
    expectedUiState:
      "The body word returns at least the review it came from. 'zzzznope' returns an empty state rather than the unfiltered list.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Clearing the box restores the full list.",
  },
};
