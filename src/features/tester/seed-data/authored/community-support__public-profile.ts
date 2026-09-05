/*
 * WHY: Authored six-part procedures for the community-support/public-profile page.
 * WHAT: 2 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Both cases are run SIGNED OUT on purpose. A public page read while signed in as
 * the owner proves nothing about what the public sees, and the store page is one
 * of the surfaces that once passed a raw store document straight into a client
 * component — publishing a decrypted WhatsApp token into the page HTML.
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
  "checklist-community-support-public-profile-view-seller-store": {
    roles: ["guest"],
    startPage: "/stores",
    steps: [
      "Open /stores in a private window with no session.",
      "Click the 'Beyblade Arena' card.",
      "Read the store header — name, logo, banner, verified badge and rating.",
      "Read the tab bar and open each tab in turn.",
      "Open the browser's View Source and search the HTML for the words accessToken, adminNotes, suspensionReason and customCommissionRate.",
    ],
    inputs: { storeId: "store-beyblade-arena" },
    expectedBehaviour:
      "The public store page is built from a projection that names every field it emits, rather than by spreading the store document and deleting a few keys. A deny-list is blind to fields nobody thought to delete — and to fields the TypeScript interface never declared at all.",
    expectedUiState:
      "The header shows 'Beyblade Arena' with its logo and banner. The tabs render their listings. None of accessToken, adminNotes, suspensionReason or customCommissionRate appears anywhere in the page source, including inside the React data payload embedded at the bottom of the HTML.",
    expectedData: { secretFieldsInHtml: 0 },
    endResult:
      "Nothing persists — read-only. A hit on any of those four words is a data leak and fails the case outright, regardless of how the page looks.",
  },
  "checklist-community-support-public-profile-view-public-profile": {
    roles: ["guest"],
    startPage: "/profile/user-tyson-blader",
    steps: [
      "Open /profile/user-tyson-blader in a private window with no session.",
      "Read the display name, avatar and bio.",
      "Open each tab on the profile.",
      "Search the page source for an email address and for a phone number.",
      "Open /profile/user-yugi-muto and read the same things.",
    ],
    inputs: { sellerProfile: "user-tyson-blader", buyerProfile: "user-yugi-muto" },
    expectedBehaviour:
      "A public profile shows what its owner chose to publish and nothing drawn from their account record. Email and phone are PII-encrypted at rest and have no business on this page in any form, masked or otherwise.",
    expectedUiState:
      "Both profiles render a display name, avatar and bio, with their tabs populated. Neither page — nor its source — contains an email address or a phone number. A profile set to Private returns a not-found page for a signed-out visitor rather than rendering with fields blanked out.",
    endResult:
      "Nothing persists — read-only. Both profiles are public in the seed, so a not-found here means the visibility default changed.",
  },
};
