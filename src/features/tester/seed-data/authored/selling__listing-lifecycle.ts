/*
 * WHY: Authored six-part procedures for the selling/listing-lifecycle page.
 * WHAT: 18 case(s), keyed by full checklist id.
 *
 * 🛑 EVERY OTHER PAGE TESTS A LISTING TYPE AT REST. THIS ONE WALKS IT.
 * Detail pages, badges and filters are covered elsewhere; what was not covered
 * anywhere is create → publish → sell → close, per type, which is where the
 * type-specific fields either survive the round trip or quietly do not.
 *
 * Adding a listing type is a five-place change and TypeScript catches only three
 * of them. The two it misses both fail SILENTLY and in the same shape — a query
 * that returns everything, or a post-filter that strips the type from every
 * unfiltered call — so a type can be fully built, fully rendered on its own page,
 * and invisible in every grid. Several cases here exist for exactly that.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const SIGN_IN_SELLER = "Sign in as tyson@beybladearena.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-selling-listing-lifecycle-standard-create-publish-sell": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create a standard listing titled 'QA Lifecycle Standard' priced at 349 with stock 1, and publish it.",
      "Open its public page and check it is buyable.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and buy it with Cash on Delivery.",
      "Sign back in as the seller and read the listing's stock and availability.",
      "Open /products and check the listing has left the Available scope.",
      "Delete the listing afterwards.",
    ],
    inputs: { title: "QA Lifecycle Standard", price: 349, stock: 1 },
    expectedBehaviour:
      "The full walk works: created, publicly buyable, bought, stock decremented, and out of the available scope once stock reaches zero. Availability is one shared rule rather than a per-surface check, so the listing must leave the scope everywhere at once.",
    expectedUiState:
      "Stock reads 0 after the purchase and the listing is absent from Available while present in All. Still appearing as buyable is the finding.",
    expectedData: { stockAfterSale: 0 },
    endResult: "The QA listing is deleted; one order exists.",
  },
  "checklist-selling-listing-lifecycle-auction-create-publish-bid-close": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create an auction titled 'QA Lifecycle Auction' with a starting bid of 500, an increment of 50 and no reserve, ending within the current test window, and publish it.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and place a bid of 550.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! and place a bid of 600.",
      "Wait for the auction to end.",
      "Read the auction page for the outcome.",
      "Sign in as the winning bidder and check the won line is in their cart.",
    ],
    inputs: { title: "QA Lifecycle Auction", startingBid: 500, increment: 50, bidA: 550, bidB: 600 },
    expectedBehaviour:
      "The auction closes at its end time and the top bidder wins. A win reaches the buyer as a LOCKED cart line rather than as a ready-made order, because that is the only checkout that knows how to collect an address, charge a method and split per store — an order written directly by settlement had no payment method and no way to pay it at all.",
    expectedUiState:
      "The auction shows as ended with the ₹600.00 bidder as the winner, and that bidder's cart holds a non-removable won line under the Won Auctions tab.",
    expectedData: { winningBid: 600 },
    endResult:
      "An auction is settled and a won line exists. Set the end time with the shared window helper so this is testable inside one run.",
  },
  "checklist-selling-listing-lifecycle-auction-reserve-respected-at-close": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create an auction titled 'QA Lifecycle Reserve' with a starting bid of 500 and a reserve of 2000, ending within the current test window, and publish it.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and bid 600.",
      "Read whether the page says the reserve has not been met.",
      "Wait for the auction to end.",
      "Read the outcome on the auction page.",
      "Check no winner was declared and no won line reached the bidder's cart.",
    ],
    inputs: { title: "QA Lifecycle Reserve", startingBid: 500, reserve: 2000, bid: 600 },
    expectedBehaviour:
      "An auction closing below its reserve awards nobody. Settlement once awarded the highest bid unconditionally and never read the reserve at all — while the reserve was displayed on the page, editable by the seller and promised in the seller guide, so the whole feature existed everywhere except in the code that decides.",
    expectedUiState:
      "The auction ends stating the reserve was not met, no winner is named, and the bidder's cart holds no won line.",
    expectedData: { winnerDeclared: false },
    endResult: "The auction ends unsold.",
  },
  "checklist-selling-listing-lifecycle-preorder-create-publish-deposit": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create a pre-order titled 'QA Lifecycle Preorder' with a full price of 2000, a deposit of 500 and a delivery date two months out, and publish it.",
      "Open its public page and read the price shown.",
      "Check the deposit and the full price are both stated and distinguishable.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add it to the cart.",
      "Read the amount charged at checkout.",
      "Delete the listing afterwards.",
    ],
    inputs: { title: "QA Lifecycle Preorder", fullPrice: 2000, deposit: 500 },
    expectedBehaviour:
      "A pre-order charges its deposit and states the remainder. Showing only one of the two numbers is the failure in both directions — the full price alone overstates what is due now, the deposit alone hides what is still owed.",
    expectedUiState:
      "The page states ₹500.00 due now against a ₹2,000.00 total, and checkout charges ₹500.00.",
    expectedData: { amountCharged: 500 },
    endResult: "The QA listing is deleted.",
  },
  "checklist-selling-listing-lifecycle-preorder-production-status-visible": {
    roles: ["seller", "guest"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Open an existing pre-order listing for edit and note its production status.",
      "Change it to a different value and save.",
      "Open its public page as a signed-out visitor.",
      "Read the production status shown.",
      "Change it once more and reload the public page.",
      "Restore the original value.",
    ],
    expectedBehaviour:
      "Production status is the field a pre-order buyer checks, so a change reaches the public page. A field the editor accepts and no page renders is a promise to the seller that nothing keeps.",
    expectedUiState:
      "The public page shows the current production status and follows each change. A status visible only in the editor is the finding.",
    endResult: "The original production status is restored.",
  },
  "checklist-selling-listing-lifecycle-prizedraw-create-publish-close-reveal": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create a prize draw titled 'QA Lifecycle Draw' with 3 entries at 100 each and a reveal window inside the current test window, and publish it.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and buy two entries.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! and buy the last one.",
      "Read the listing once the entries are gone.",
      "Wait for the reveal and read the outcome.",
      "Check a real entrant is named as the winner.",
    ],
    inputs: { title: "QA Lifecycle Draw", entries: 3, pricePerEntry: 100 },
    expectedBehaviour:
      "A prize draw sells its entries, closes when they are gone and reveals a winner drawn from real entrants. A draw that closes without ever revealing leaves buyers holding paid entries with no outcome, which is indistinguishable from the site having forgotten them.",
    expectedUiState:
      "The draw shows as closed once all three entries are sold, and after the reveal it names one of the two real entrants as the winner.",
    expectedData: { entriesSold: 3 },
    endResult: "The draw is revealed with a winner.",
  },
  "checklist-selling-listing-lifecycle-classified-create-publish-contact": {
    roles: ["seller", "guest"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create a classified titled 'QA Lifecycle Classified' priced at 750, with the city Bengaluru and a contact method, and publish it.",
      "Open its public page as a signed-out visitor.",
      "Read whether an Add to Cart control is offered.",
      "Read what contact affordance is offered instead.",
      "Check the city is shown.",
      "Delete the listing afterwards.",
    ],
    inputs: { title: "QA Lifecycle Classified", price: 750, city: "Bengaluru" },
    expectedBehaviour:
      "A classified cannot be carted at all — it is a contact-the-seller listing, and the cart is blocked for it by capability rather than by the page choosing not to draw the button. A cart control that appears and then fails is the failure this rules out.",
    expectedUiState:
      "No cart control anywhere on the page, a working contact affordance, and Bengaluru shown as the location.",
    expectedData: { cartControlPresent: false },
    endResult: "The QA listing is deleted.",
  },
  "checklist-selling-listing-lifecycle-digitalcode-create-publish-claim": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create a digital-code listing titled 'QA Lifecycle Code' priced at 199 with a pool of two codes, set to auto-claim, and publish it.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and buy one.",
      "Read where the code is delivered and whether it arrives immediately.",
      "Open the order and check the code is retrievable from it.",
      "Sign back in as the seller and read the remaining pool count.",
      "Delete the listing afterwards.",
    ],
    inputs: { title: "QA Lifecycle Code", price: 199, poolSize: 2 },
    expectedBehaviour:
      "A digital code fulfils from its pool at purchase and the pool shrinks. Fulfilment is immediate for this type, so a code that has to be chased by hand defeats the whole listing type.",
    expectedUiState:
      "The buyer receives a code straight away and can find it again on the order; the pool reads one remaining.",
    expectedData: { poolRemaining: 1 },
    endResult: "The QA listing is deleted.",
  },
  "checklist-selling-listing-lifecycle-digitalcode-pool-depletes": {
    roles: ["buyer"],
    startPage: "/digital-codes",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! so sandbox fixtures are visible.",
      "Open /digital-codes and find the seeded listing whose code pool is depleted.",
      "Open it and read whether it can be bought.",
      "Read its stock number.",
      "Compare that stock number against the pool count.",
      "Open /digital-codes on the Available scope and check the listing is not there.",
    ],
    expectedBehaviour:
      "Availability for this type is the NESTED codes-available count, not the stock field — and the two disagree on purpose in the seed, so a check reading stock alone passes while the listing is unbuyable. The branch that reads the pool once looked at a top-level field the record does not have, so it had never fired even once.",
    expectedUiState:
      "The listing is not buyable and is absent from the Available scope, even though its stock number is above zero. Finding it buyable is the finding.",
    endResult: "Read-only.",
  },
  "checklist-selling-listing-lifecycle-live-create-publish-jurisdiction": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create a live-item listing titled 'QA Lifecycle Live' priced at 5000, with a species and a restricted jurisdiction list, and publish it.",
      "Open its public page and read the jurisdiction and vendor-verification notices.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Attempt to buy it with a delivery address outside the allowed jurisdiction.",
      "Read what happens and where the refusal appears.",
      "Delete the listing afterwards.",
    ],
    inputs: { title: "QA Lifecycle Live", price: 5000 },
    expectedBehaviour:
      "A live item states its jurisdiction restriction and refuses a purchase outside it. A refusal that only appears after payment is the shape that matters — the buyer has paid for something that cannot legally be sent.",
    expectedUiState:
      "The restriction is stated on the listing, and the purchase is refused before payment with a message naming the jurisdiction.",
    endResult: "The QA listing is deleted; nothing is charged.",
  },
  "checklist-selling-listing-lifecycle-art-create-publish-sell": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create an art listing titled 'QA Lifecycle Art' priced at 1200, with a size, a material, a finish and an edition size, and publish it.",
      "Open its public page and check all four fields render.",
      "Open the listing for edit and check all four survived the round trip.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add it to the cart.",
      "Check checkout proceeds through the standard flow.",
      "Delete the listing afterwards.",
    ],
    inputs: { title: "QA Lifecycle Art", price: 1200 },
    expectedBehaviour:
      "Art carries its own print fields and otherwise checks out exactly like a standard listing — it deliberately has no dedicated detail route. The fields surviving the edit round trip is the real check; a field written on create and dropped on update is invisible until somebody edits.",
    expectedUiState:
      "Size, material, finish and edition size all render publicly and are all still there after reopening the editor. Checkout is the ordinary flow.",
    endResult: "The QA listing is deleted.",
  },
  "checklist-selling-listing-lifecycle-sticker-create-publish-sell": {
    roles: ["seller", "buyer"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Create a sticker listing titled 'QA Lifecycle Sticker' priced at 149, with its print fields filled, and publish it.",
      "Open its public page and check the print fields render.",
      "Open the listing for edit and check they survived.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add it to the cart.",
      "Check checkout proceeds through the standard flow.",
      "Delete the listing afterwards.",
    ],
    inputs: { title: "QA Lifecycle Sticker", price: 149 },
    expectedBehaviour:
      "Stickers share the art type's shape and the standard checkout. Both types were added to the type union and the registry but not to the query layer's allowlist, so every query for them silently dropped its own type filter and returned nothing — which is why they are walked separately rather than assumed to follow art.",
    expectedUiState:
      "The print fields render publicly and survive the editor round trip, and checkout is the ordinary flow.",
    endResult: "The QA listing is deleted.",
  },
  "checklist-selling-listing-lifecycle-type-badge-correct-on-card": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products and tick every listing-type chip in turn.",
      "For each type, read the badge on its cards.",
      "Write down the badge text and colour for all nine types.",
      "Check no two types share a badge.",
      "Check every badge is legible against its card, in light and in dark mode.",
    ],
    expectedBehaviour:
      "Each type carries its own badge. A badge map covering fewer types than the union renders an identical fallback for the rest, so several types become visually indistinguishable in a grid — which once affected five of nine at the same time.",
    expectedUiState:
      "Nine distinct badges, each readable in both themes. Two types sharing a badge, or a type with none, are findings named by type.",
    expectedData: { distinctBadges: 9 },
    endResult: "Read-only.",
  },
  "checklist-selling-listing-lifecycle-type-detail-route-correct": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products and select one listing type at a time.",
      "Click a card of that type and read the URL it lands on.",
      "Check the URL is that type's own route rather than the standard product path.",
      "Repeat for all nine types.",
      "Do the same from a related-items carousel on a product page.",
      "Record any type that lands on the wrong route from either surface.",
    ],
    expectedBehaviour:
      "Every card resolves to its own type's page — from the grid AND from a carousel. Three types were pointed at the standard product page despite having working dedicated routes, and separately a shared card builder dropped the type field entirely, so a card could carry nine correct fields and still route wrong because of the tenth.",
    expectedUiState:
      "All nine land on their own routes from both the grid and a carousel. A type landing on the standard product path is the finding, recorded with which surface produced it.",
    expectedData: { wrongRoutes: 0 },
    endResult: "Read-only.",
  },
  "checklist-selling-listing-lifecycle-type-survives-edit": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Open an existing auction listing for edit.",
      "Change only its description and save.",
      "Reload the editor and read the listing type.",
      "Open the public listing and check it is still on the auction route with the auction badge.",
      "Repeat with a pre-order and with a classified.",
    ],
    expectedBehaviour:
      "Editing an unrelated field does not change the type. A row builder collapsing several types into one on the way into a form, or a form defaulting the type when the field is absent from the payload, both convert a listing on save — and the seller has no reason to check.",
    expectedUiState:
      "All three keep their type after an unrelated edit, on the editor and on the public page. A type that reverted to standard is the finding.",
    endResult: "The descriptions are restored.",
  },
  "checklist-selling-listing-lifecycle-unpublish-removes-from-public": {
    roles: ["seller", "guest"],
    startPage: "/store/products",
    steps: [
      SIGN_IN_SELLER,
      "Pick a published listing and note its public URL.",
      "Unpublish it.",
      "As a signed-out visitor, open /products and search for it.",
      "Open its public URL directly and read what happens.",
      "Sign back in as the seller and check the listing is still listed and editable.",
      "Republish it and check it returns publicly.",
    ],
    expectedBehaviour:
      "Unpublishing removes a listing from public grids while keeping it in the seller's own list and editable. It is the reversible half of the pair whose irreversible half is delete, so keeping it fully editable is what makes it usable.",
    expectedUiState:
      "The listing is absent from the public grid, its direct URL does not present it as buyable, it is still in the seller's list, and republishing restores it exactly.",
    endResult: "The listing is republished.",
  },
  "checklist-selling-listing-lifecycle-sold-listing-leaves-available-tab": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products on the Available scope and note the total count.",
      "Switch to Sold & Ended and read the count.",
      "Switch to All and read the count.",
      "Check the first two sum to the third.",
      "Pick a listing from Sold & Ended and check it is absent from Available and present in All.",
      "Repeat on /auctions, where the middle tab should read Ended rather than Sold.",
    ],
    expectedBehaviour:
      "The three scopes partition the catalogue, and the middle tab's label follows the type — Ended for auctions, Sold for art, Sold & Ended where several types are mixed. A count that saturates the page limit is reported as a floor rather than as an exact figure, so a paginator does not claim a false last page.",
    expectedUiState:
      "Available plus Sold & Ended equals All, a sold listing is in the second and third only, and the auctions page reads Ended. A count shown as an exact number when it is saturated is a smaller finding worth recording.",
    endResult: "Read-only.",
  },
  "checklist-selling-listing-lifecycle-closed-listing-still-viewable": {
    roles: ["guest"],
    startPage: "/auctions",
    steps: [
      "Open /auctions on the Sold & Ended scope and open an ended auction.",
      "Read whether the page loads and what it says about the outcome.",
      "Open a closed prize draw and read the same.",
      "Open a sold-out pre-order and read the same.",
      "Open a depleted digital-code listing and read the same.",
      "Check none of the four returns a not-found page.",
    ],
    expectedBehaviour:
      "A finished listing keeps its page and states how it finished. Buyers, bidders and entrants all hold links to these; turning them into not-found pages breaks every one of those links at the exact moment somebody wants to check what happened.",
    expectedUiState:
      "All four load and each states its outcome — ended, closed, sold out, depleted — rather than a buy control or a 404.",
    expectedData: { notFoundPages: 0 },
    endResult: "Read-only.",
  },
};
