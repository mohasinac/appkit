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
      "Open the store's offers list and read every row — product, offered amount, listed price, status and round.",
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
      "Open the store's product-features page and read the existing features.",
      "Create one named 'QA Feature marketing-extras' with an icon and a description, and save.",
      "RELOAD and read every field.",
      "Open a product editor and attach that feature to 'Beyblade Burst B-01 Valkyrie', then save.",
      "Open the product's public page and read whether the feature is shown.",
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
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's Google reviews sync surface and read what it asks for.",
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
  "checklist-selling-seller-marketing-extras-seller-whatsapp-catalog": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's WhatsApp catalog surface and read every control.",
      "Read what it says about the connection state.",
      "Read whether it names the business account and catalog it would sync with.",
      "Trigger a catalog action without a token configured and read the message.",
    ],
    expectedBehaviour:
      "The catalog surface reports its connection state honestly and declines cleanly when unconfigured. It is the reader of the store's WhatsApp configuration, which is stored encrypted and decrypted on every store read — so what this page shows is the one place the configuration is legitimately visible to its owner.",
    expectedUiState:
      "The connection state is stated rather than implied. An unconfigured action produces a readable message naming what is missing, not a provider error. The business account and catalog identifiers are shown to the owner but partially masked.",
    endResult: "Nothing is synced.",
  },
  "checklist-selling-seller-marketing-extras-seller-whatsapp-token-save": {
    roles: ["seller", "guest"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's WhatsApp settings and type QA-WHATSAPP-TOKEN-118427 into the access-token field.",
      "Save and RELOAD, then read how the token is displayed.",
      "Open the browser's View Source on that settings page and search for QA-WHATSAPP-TOKEN-118427.",
      "Open /stores/store-beyblade-arena in a private window with no session.",
      "Open View Source there and search for QA-WHATSAPP-TOKEN-118427 and for accessToken.",
      "Clear the token field, save, and reload to confirm it is gone.",
    ],
    inputs: { token: "QA-WHATSAPP-TOKEN-118427" },
    expectedBehaviour:
      "The token is stored double-encrypted and shown masked to its owner. Because it is decrypted on every read of the store document, the real risk is a page that passes that document to a client component — which serialises it into the public page HTML. The PUBLIC page source is therefore the assertion, not the masked field.",
    expectedUiState:
      "After the reload the owner sees a masked value rather than the full token. The public store page's source contains neither the token nor the word accessToken anywhere, including inside the embedded data payload.",
    expectedData: { tokenInPublicSource: 0 },
    endResult:
      "The token is cleared by the final step. A hit on the public page is a credential leak and fails the case outright, however the settings page renders.",
  },
  "checklist-selling-seller-marketing-extras-seller-whatsapp-import-runs-in-background": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's WhatsApp catalog surface and start an import.",
      "Read what the page shows immediately — whether it blocks or returns.",
      "Navigate to another store page and back.",
      "Read whether the import's progress is still reported.",
      "Wait for it to finish and read the summary.",
    ],
    expectedBehaviour:
      "An import of unknown size is enqueued as a job rather than run inside the request — a route that fans out over a whole catalogue is exactly the shape the ten-second function ceiling kills in production while local runs pass. The page subscribes to the job's progress instead of waiting on a response.",
    expectedUiState:
      "The page returns immediately with a job accepted rather than freezing. Progress survives navigating away and back. A completion summary states what was imported. A request that hangs and then times out is the failure this case exists for.",
    endResult:
      "Whatever was imported persists. With no credentials configured the import will decline instead — record that rather than failing the case.",
  },
  "checklist-selling-seller-marketing-extras-seller-whatsapp-import-skips-already-synced": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's WhatsApp catalog surface and run an import, noting the summary and the store's product count.",
      "Run the SAME import a second time without changing anything.",
      "Read the second summary and compare it against the first.",
      "Open /store/products and read the product count again.",
      "Search the products list for any duplicated title.",
    ],
    expectedBehaviour:
      "A second import skips what is already synced rather than creating duplicates. This is the same idempotency the seed data needs: an import keyed on a stable external identifier upserts, while one keyed on anything regenerated per run creates a fresh copy every time and reports success.",
    expectedUiState:
      "The second summary reports items skipped rather than a second full import. The product count is unchanged and no title appears twice.",
    expectedData: { duplicateTitles: 0 },
    endResult:
      "No duplicates exist. A doubled product count after a repeated import is the failure, and the summary will still have read as successful.",
  },
  "checklist-selling-seller-marketing-extras-seller-whatsapp-push-product-link-opens": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and use the WhatsApp push or share control on 'Beyblade Burst B-01 Valkyrie'.",
      "Read the message it composes before sending anything.",
      "Read the product link inside it and note its host and path.",
      "Open that link in a private window with no session.",
      "Read the page it opens.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "The shared link is a public, canonical URL a stranger can open. There is one definition of the site host and everything derives from it — two owners drifted once and every sitemap URL pointed at a host that redirected, which is what took the site out of search.",
    expectedUiState:
      "The message contains a link on the canonical host with an unprefixed path. Opening it signed out renders the product page directly rather than redirecting, and does not 404.",
    endResult:
      "Nothing is sent. A link that redirects before landing is worth recording — every redirect is a hop a shared link pays on every open.",
  },
  "checklist-selling-seller-marketing-extras-seller-reviews-response": {
    roles: ["seller", "guest"],
    startPage: "/store/reviews",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's reviews list and open a review with no seller response.",
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
