/*
 * WHY: Authored six-part procedures for the admin/bundles page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A BUNDLE IS A CATEGORY ROW, not a listing type, and its member list is
 * MIRRORED onto the bundle for index-friendly reads. Every public reader consults
 * that mirror, so a write path that updates the rule and forgets the mirror
 * produces a bundle that renders as "0 items" with no error anywhere.
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
  "checklist-admin-bundles-bundle-create": {
    roles: ["admin", "guest"],
    startPage: "/admin/bundles",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bundles and create one named 'QA Bundle admin-create'.",
      "Add product-beyblade-burst-valkyrie (₹999) and product-beyblade-x-wizard-arrow (₹899) as members.",
      "Set the bundle price to 1500 and save.",
      "RELOAD the editor and read the members, the price and the original total.",
      "Open /bundles/{slug} in a private window and read the members, price and discount badge.",
      "Attempt to add a member from a different store and read what happens.",
    ],
    inputs: {
      name: "QA Bundle admin-create",
      member1: "product-beyblade-burst-valkyrie",
      member2: "product-beyblade-x-wizard-arrow",
      bundlePrice: 1500,
      memberTotal: 1898,
    },
    expectedBehaviour:
      "The bundle stores its members, its locked price and the members' undiscounted total — the last of these is what drives the discount badge, so a bundle without it shows a price and no saving. Members must come from one store: the store id is the order-splitting key, and a cross-store bundle produces an order belonging to one seller holding another's products.",
    expectedUiState:
      "After the reload both members are listed with a bundle price of ₹1,500 against ₹1,898. The public page shows both members and a discount badge. The cross-store member is refused at save time with a message naming the reason.",
    expectedData: { memberCount: 2, bundlePrice: 1500 },
    endResult: "Leave the bundle in place — the next three cases read it.",
  },
  "checklist-admin-bundles-bundle-stock-sync": {
    roles: ["admin", "seller", "guest"],
    startPage: "/admin/bundles",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open /bundles/{slug} for 'QA Bundle admin-create' in a private window, noting it is purchasable.",
      "Sign in as tyson@beybladearena.in / TempPass123! and set product-beyblade-x-wizard-arrow's stock to 0.",
      "Reload the bundle's public page and read its availability.",
      "Open /admin/bundles and read the bundle's row.",
      "Set the product's stock back to its original value.",
      "Reload the bundle's public page and read its availability again.",
    ],
    inputs: { member: "product-beyblade-x-wizard-arrow" },
    expectedBehaviour:
      "A bundle is all-or-nothing, so one member going out of stock makes the whole bundle unavailable. That is kept in sync by a hook on the member's stock change rather than computed per request — which is what makes the reverse direction worth testing too: restoring the stock must restore the bundle.",
    expectedUiState:
      "With the member at zero the bundle reads as unavailable and cannot be purchased. After the stock is restored it becomes purchasable again. A bundle still offering purchase with a zero-stock member is the failure.",
    endResult:
      "The member's stock is restored. Both directions matter — a sync that only ever disables is half a sync.",
  },
  "checklist-admin-bundles-bundle-edit-delete": {
    roles: ["admin", "guest"],
    startPage: "/admin/bundles",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the editor for 'QA Bundle admin-create' and write down every field.",
      "Change ONLY the bundle price to 1400 and save.",
      "RELOAD and compare every field against what was written down.",
      "Remove one member, save, RELOAD, and read the member list and the original total.",
      "Open the public page and read the members and the discount.",
      "Delete the bundle and confirm it is gone from /admin/bundles and from /bundles.",
    ],
    inputs: { priceBefore: 1500, priceAfter: 1400 },
    expectedBehaviour:
      "An edit writes back only what changed, and removing a member recomputes the undiscounted total — a stale total makes the discount badge claim a saving that no longer exists. The delete removes it from the public listing too.",
    expectedUiState:
      "After the price edit only the price differs. After the member removal the list holds one member and the original total has fallen accordingly. After the delete the bundle is absent from both surfaces.",
    endResult:
      "The bundle is deleted. A public page still rendering a deleted bundle is a cache or projection failure worth naming.",
  },
  "checklist-admin-bundles-bundle-brand-picker": {
    roles: ["admin", "guest"],
    startPage: "/admin/bundles",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bundles and create one named 'QA Bundle brand-picker' with two members from Beyblade Arena.",
      "Find the brand picker and read what it offers.",
      "Select Beyblade as the bundle's brand and save.",
      "RELOAD and read the brand.",
      "Open /brands/brand-beyblade in a private window and find the bundle in its Bundles tab.",
      "Clear the brand, save, reload, and check the bundle leaves that tab.",
      "Delete the bundle.",
    ],
    inputs: { name: "QA Bundle brand-picker", brand: "Beyblade" },
    expectedBehaviour:
      "A bundle's own brand tag is a DIFFERENT field from any brand filter inside a dynamic member rule — the tag says which brand the bundle belongs to regardless of how its members were resolved, and it is what the brand page's Bundles tab filters on. Not every bundle needs one; a genuinely cross-brand bundle leaves it unset.",
    expectedUiState:
      "The picker offers real brands. With the brand set the bundle appears in that brand's Bundles tab; with it cleared it leaves. A bundle appearing on a brand page it was never tagged with means the tab is filtering on the member rule instead.",
    endResult: "The bundle is deleted by the final step.",
  },
};
