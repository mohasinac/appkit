/*
 * WHY: Authored six-part procedures for the selling/seller-marketing-extras page.
 * WHAT: 9 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE WHATSAPP ACCESS TOKEN IS DOUBLE-ENCRYPTED and decrypted on EVERY read of
 * the store document, so any code path that forgets to project is handling
 * plaintext. Four pages once passed the raw document into a client component and
 * published that token in the page HTML. The token case therefore reads the page
 * source rather than trusting the masked field.
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
  "checklist-selling-seller-marketing-extras-seller-offers-list": {
    roles: ["seller"],
    startPage: "/store/offers",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/offers and read every row — product, offered amount, listed price, status and round.",
      "Read every status filter offered and select each in turn, noting any that returns nothing.",
      "For each empty filter, check the unfiltered list for rows carrying that status.",
      "Open one offer and read its detail, including any earlier rounds.",
      "Read the row actions offered and check at least one lets you VIEW rather than only act.",
    ],
    expectedBehaviour:
      "The list shows offers against this store with enough context to decide — the offered amount against the listed price is the entire negotiation. A chain of counters is one story: each round is its own document, linked forwards and backwards and denormalised to the chain's root so a row can say 'Round 2' with no extra reads.",
    expectedUiState:
      "Rows show product, offered amount, listed price and round number. Every status filter either returns its own rows or is empty with none unfiltered either — the real statuses include countered and withdrawn, and a chip naming 'Rejected' when the stored value is 'Declined' matches nothing forever. A view affordance exists; a menu of pure mutations lets a seller act on an offer they never read.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-marketing-extras-seller-features-crud": {
    roles: ["seller"],
    startPage: "/store/features",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/features and read the existing features.",
      "Create one named 'QA Feature marketing-extras' with an icon and a description, and save.",
      "RELOAD and read every field.",
      "Open /store/products, find 'Beyblade Burst B-01 Valkyrie', open its editor, attach that feature and save.",
      "Open the product's public page at /products/{its slug} and read whether the feature is shown.",
      "Detach it, then delete the feature.",
    ],
    inputs: { name: "QA Feature marketing-extras", productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "A feature is created once and attached to many listings, and it reaches the public page. A feature that saves in its own list but never renders on a product is a field with no reader — the seller believes they have said something the buyer never sees.",
    expectedUiState:
      "After the reload the feature holds its name, icon and description. The product's public page shows it. A public page with no trace of the attached feature is the failure.",
    endResult:
      "The feature is detached and deleted by the final step, so the seeded product is left as it was.",
  },
  "checklist-selling-seller-marketing-extras-seller-google-reviews-sync": {
    roles: ["seller"],
    startPage: "/store/google-reviews",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/google-reviews and read what it asks for.",
      "Read whether it states that credentials are required and which ones.",
      "Trigger a sync without credentials configured and read the message.",
      "Read whether any error mentions a provider, a key, or a raw response.",
      "Read the store's public page for any Google reviews section.",
    ],
    expectedBehaviour:
      "With no Google credentials configured the sync declines cleanly and says so. The Places credentials are seeded as EMPTY strings rather than placeholders precisely so an unconfigured consumer skips instead of making a billed call that fails — a placeholder would be treated as a usable key.",
    expectedUiState:
      "The message names the missing configuration in plain English. It does not surface a provider error code, an API key, or a raw response body. The public store page shows no empty Google reviews section.",
    endResult:
      "Nothing is synced. If credentials ARE configured on this environment, record that and read what the sync actually imported instead.",
  },
  "checklist-selling-seller-marketing-extras-seller-reviews-response": {
    roles: ["seller", "guest"],
    startPage: "/store/reviews",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/reviews and open a review with no seller response.",
      "Type 'QA Response seller-reviews-response — thanks for the feedback.' as the response and save.",
      "RELOAD and read the response.",
      "Open that review on the product's public page in a private window.",
      "Read whether the response is shown and how it is attributed.",
      "Edit the response, save, reload, and read it again.",
    ],
    inputs: { response: "QA Response seller-reviews-response — thanks for the feedback." },
    expectedBehaviour:
      "A seller response is stored on the review and rendered publicly, attributed to the store rather than to a person. It can be edited afterwards — a response that can only be written once leaves a typo permanent on a public page.",
    expectedUiState:
      "After the reload the response is on the review in the dashboard AND on the public product page, attributed to the store. The edit persists too. The reviewer's own name stays masked; a response does not unmask it.",
    endResult:
      "Delete the response afterwards so the seeded review is left as it was.",
  },
};
