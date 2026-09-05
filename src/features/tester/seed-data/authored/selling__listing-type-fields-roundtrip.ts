/*
 * WHY: Authored six-part procedures for the selling/listing-type-fields-roundtrip page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A ROUND TRIP IS SAVE -> RELOAD -> READ, and the reload is the whole case.
 * Every defect these five exist for returns a success and renders correctly
 * until the page is refreshed: a field the form cannot name is sent as undefined
 * and overwrites, a create-time transform the update path does not repeat writes
 * the wrong shape, and an editor seeded from a stripped read saves the stripped
 * values back.
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
  "checklist-selling-listing-type-fields-roundtrip-roundtrip-classified-meetup": {
    roles: ["seller"],
    startPage: "/store/classified/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the classified creation form and type 'QA Classified roundtrip-meetup' as the title.",
      "Set the city to Mumbai, the contact method to chat, negotiable to on, and accepts-shipping to off.",
      "Type 1500 as the price and fill every other required field.",
      "Save.",
      "RELOAD the editor for that listing and read all four type-specific values.",
      "Open the listing's public page and read the same four.",
      "Delete the listing.",
    ],
    inputs: {
      title: "QA Classified roundtrip-meetup",
      city: "Mumbai",
      contactMethod: "chat",
      negotiable: true,
      acceptsShipping: false,
      price: 1500,
    },
    expectedBehaviour:
      "Every classified-specific field survives the round trip and reaches the public page. These fields also back the store tab's own facets, so a value that fails to persist makes the corresponding filter permanently empty rather than visibly broken.",
    expectedUiState:
      "After the reload the editor shows Mumbai, chat, negotiable on, shipping off. The public page shows the same, and the purchase panel offers the contact path rather than a cart control.",
    expectedData: { city: "Mumbai", negotiable: true, acceptsShipping: false },
    endResult:
      "The listing is deleted by the final step. A boolean that reads back as off when it was saved on is the classic undefined-overwrite.",
  },
  "checklist-selling-listing-type-fields-roundtrip-roundtrip-live-species-jurisdictions": {
    roles: ["seller"],
    startPage: "/store/live/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/live/new and type 'QA Live Item roundtrip-species' as the title.",
      "Set the species to Dog, the breed to Golden Retriever, the sex to male and the age to 6 months.",
      "Set the allowed jurisdictions to Maharashtra and Karnataka only.",
      "Upload public/test-media/sample-video.mp4 and type 2000 as the price.",
      "Save.",
      "RELOAD the editor and read every one of those values.",
      "Open the public page and read the species line and the delivery restrictions.",
      "Delete the listing.",
    ],
    inputs: {
      title: "QA Live Item roundtrip-species",
      species: "Dog",
      breed: "Golden Retriever",
      sex: "male",
      ageMonths: 6,
      jurisdictions: "Maharashtra, Karnataka",
      price: 2000,
    },
    expectedBehaviour:
      "Species, breed, sex, age and the jurisdiction list all round-trip. The jurisdiction list is the one that matters most: it gates whether the item can be sold to a given buyer at all, so a list that saves empty silently removes the restriction rather than failing loudly.",
    expectedUiState:
      "After the reload every value is present, with BOTH jurisdictions still selected. The public page shows the species line and states the delivery restriction rather than leaving it blank.",
    expectedData: { species: "Dog", jurisdictionCount: 2 },
    endResult:
      "The listing is deleted by the final step. An empty jurisdiction list after reload is a safety failure, not a formatting one.",
  },
  "checklist-selling-listing-type-fields-roundtrip-roundtrip-digital-code-delivery": {
    roles: ["seller"],
    startPage: "/store/digital-codes/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the digital-code creation form and type 'QA Digital Code roundtrip-delivery' as the title.",
      "Set the delivery mode to auto-claim and type 250 as the price.",
      "Add three codes to the pool and save.",
      "RELOAD the editor and read the delivery mode and the pool count.",
      "Open the public page and read the availability shown.",
      "Change the delivery mode to manual email, save, reload and read it again.",
      "Delete the listing.",
    ],
    inputs: {
      title: "QA Digital Code roundtrip-delivery",
      deliveryMode: "auto-claim",
      price: 250,
      codeCount: 3,
    },
    expectedBehaviour:
      "The delivery mode and the code pool both round-trip, and the mode can be changed after creation. Availability for this type reads the NESTED pool count rather than the stock figure, so the public page's availability must follow the pool.",
    expectedUiState:
      "After each reload the editor shows the mode last saved and a pool of three. The public page reports availability consistent with the pool rather than with a separate stock number.",
    expectedData: { codesAvailable: 3 },
    endResult:
      "The listing is deleted by the final step. A mode that reverts to its default on reload means the update path does not accept it.",
  },
  "checklist-selling-listing-type-fields-roundtrip-roundtrip-print-meta": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the art or sticker creation form and type 'QA Art Print roundtrip-meta' as the title.",
      "Set the size, the material, the finish and the edition size, noting each value.",
      "Type 800 as the price and save.",
      "RELOAD the editor and read all four print fields.",
      "Open the public page and read the same four.",
      "Delete the listing.",
    ],
    inputs: { title: "QA Art Print roundtrip-meta", price: 800 },
    expectedBehaviour:
      "The print-specific fields round-trip and reach the public page. Art and stickers were added to the type union and the plugin registry without being added to the repository's filter-alias map, so their queries silently ran with no type filter — which makes any authoring case for these two worth running end to end rather than trusting the editor alone.",
    expectedUiState:
      "After the reload all four print fields hold their typed values. The public page renders them in its specification panel rather than omitting the section.",
    endResult:
      "The listing is deleted by the final step.",
  },
  "checklist-selling-listing-type-fields-roundtrip-roundtrip-edit-form-opens-populated": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and open the editor for 'Beyblade Burst B-01 Valkyrie'.",
      "Read every field the form offers and note which are empty.",
      "Compare each against the public page for that product.",
      "Change nothing and save.",
      "RELOAD the public page and check nothing has changed — title, price, description, images, category, brand, stock.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "An edit form opens populated from a read that strips nothing, and a no-op save writes back exactly what was there. This is the single most valuable case on the page: a form seeded from a projection that drops fields will save those drops back, so opening and saving an untouched record quietly deletes data.",
    expectedUiState:
      "Every field carrying a value on the public page carries the same value in the form. After the no-op save and reload, the public page is byte-for-byte what it was — same images in the same order, same category and brand links, same stock figure.",
    expectedData: { fieldsChangedByNoOpSave: 0 },
    endResult:
      "The product is unchanged. Any field that emptied itself through an untouched save is the finding, and it is the highest-severity kind on this page.",
  },
};
