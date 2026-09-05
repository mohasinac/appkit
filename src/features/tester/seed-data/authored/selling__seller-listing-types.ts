/*
 * WHY: Authored six-part procedures for the selling/seller-listing-types page.
 * WHAT: 18 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 ADDING A LISTING TYPE IS A FIVE-PLACE CHANGE and the compiler catches three.
 * The two it misses are the repository's filter-alias map — omit a type there and
 * the alias returns an empty value that is then DROPPED, so the query runs with no
 * type filter and returns everything — and the enabled-types map. Several cases
 * here exist to make that specific silence visible from the UI.
 *
 * The seller coupon cases mirror the buyer-side stacking ones deliberately: the
 * buckets are one coupon per store plus one platform-wide, and a seller must not
 * be able to mint the platform-wide kind.
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
  "checklist-selling-seller-listing-types-seller-listing-type-dropdown-all-types": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and open the listing-type dropdown.",
      "Write down every option offered.",
      "Compare that list against the nine types the catalogue supports.",
      "Select each option in turn and read the rows returned.",
      "Write down any option returning the full unfiltered list rather than its own type.",
    ],
    expectedBehaviour:
      "Every type is offered and each filters to its own. A type present in the union and the plugin registry but missing from the repository's alias map produces an empty filter value that is silently dropped — so the page returns EVERYTHING under that heading, which reads as the seller owning far more than they do rather than as a broken filter.",
    expectedUiState:
      "Nine options, and each returns only its own type. An option showing the full catalogue is the dropped-filter failure; an option missing entirely is the other half of the same defect. `bundle` must NOT be offered — it stopped being a listing type and a chip for it matches zero rows forever.",
    expectedData: { typeOptionCount: 9 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-listing-types-seller-products-badge-per-type": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products with no type filter so every type is listed.",
      "Read the badge on a row of each type present.",
      "Write down any two types sharing an identical badge.",
      "Switch to dark mode and read the badges again.",
    ],
    expectedBehaviour:
      "Each type renders its own badge. The badge map is keyed on the type union, and a map covering only some types renders an identical fallback for the rest — five of nine once looked the same, which makes the list unreadable at a glance without telling anyone anything is wrong.",
    expectedUiState:
      "Every type shows a distinct badge and each is readable in both themes. Two types sharing a badge is the failure, named by the pair.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-selling-seller-listing-types-seller-products-featured-promoted-sorts": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and read the sort dropdown's options.",
      "Select 'Featured first' and read the row order.",
      "Select 'Promoted first' and read the row order.",
      "Compare both against the default order.",
      "Reload with one applied and read the order on first paint.",
    ],
    expectedBehaviour:
      "Both sorts reorder the rows. A sort whose field is not marked sortable is dropped before the query runs, so the dropdown changes and nothing moves — these two shipped exactly that way and were dead on arrival, unreported, because a sort that does nothing looks like a list that happens to already be in that order.",
    expectedUiState:
      "Featured rows rise to the top under the first sort and promoted rows under the second, and both orders differ from the default. After a reload the chosen order holds on first paint. An unchanged order under either is the failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-listing-types-seller-products-auctions-default-load": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products with no query parameters and read the availability scope selected.",
      "Read the rows and note whether sold or ended listings are among them.",
      "Open the store's auctions listing the same way and read its scope and rows.",
      "Switch each to the 'All' scope and compare the counts.",
    ],
    expectedBehaviour:
      "A seller's own listing pages default to a scope that shows their live inventory, and the scope is derived from one shared helper so the server's first paint and the control agree. Where they are computed separately the first paint shows one set and the control claims another — and because the client caches the server's data indefinitely, the disagreement never resolves.",
    expectedUiState:
      "Both pages open on the same declared scope with the tabs reflecting it. The All scope returns more rows than the default on at least one of them, which is what proves the default is scoping rather than showing everything already.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-selling-seller-listing-types-auction-row-shows-bid-info": {
    roles: ["seller"],
    startPage: "/store/auctions",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's auctions listing and read each row.",
      "Check each shows the current bid, the bid count and time remaining.",
      "Compare one row's figures against that auction's public page.",
      "Find an ended auction and read what its row shows in place of time remaining.",
    ],
    expectedBehaviour:
      "An auction row carries the three figures a seller needs to decide anything — current bid, bid count, time left. A row showing only a title and a price is a row that forces them to open every auction to learn its state.",
    expectedUiState:
      "Every live row shows current bid, bid count and remaining time, and they match the public page. An ended row reads as ended rather than showing a negative or frozen countdown.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-seller-listing-types-seller-coupons-crud": {
    roles: ["seller"],
    startPage: "/store/coupons",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's coupons page and read the existing coupons.",
      "Create one with the code QASELLER10, 10% off, a minimum purchase of 500 and an end date a week out.",
      "Save, RELOAD, and read every field.",
      "Edit only the minimum purchase to 800, save, RELOAD, and read every field again.",
      "Read any field labelled in paise rather than rupees.",
      "Delete the coupon and RELOAD to confirm.",
    ],
    inputs: { code: "QASELLER10", percent: 10, minPurchaseBefore: 500, minPurchaseAfter: 800 },
    expectedBehaviour:
      "Create, edit and delete persist, and an edit to one field leaves the rest alone — including the validity dates, which a wholesale replace would wipe when only one sub-field was sent. Money is stored in rupees with decimals; a field labelled or validated as paise is a hundredfold data-entry hazard.",
    expectedUiState:
      "Each operation survives its reload. After the minimum-purchase edit the dates and percentage are unchanged. No field is labelled 'paise', and a decimal amount such as 799.50 is accepted rather than rejected as non-integer.",
    endResult: "The coupon is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-coupon-auto-scoped-to-own-store": {
    roles: ["seller"],
    startPage: "/store/coupons",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's coupons page and start creating a coupon.",
      "Read every field for a store or scope selector.",
      "Create one coded QASCOPE10 and save.",
      "RELOAD and read which store it is attached to.",
      "Sign out, sign in as tester@letitrip.in / TempPass123!, and check QASCOPE10 does not appear in that seller's coupons.",
      "Sign back in as tyson and delete it.",
    ],
    inputs: { code: "QASCOPE10" },
    expectedBehaviour:
      "The store is resolved from the session and written server-side — the form never offers it. A seller choosing their own scope could attach a discount to someone else's catalogue, so the absence of that control IS the security property.",
    expectedUiState:
      "No store or scope selector is offered. The saved coupon is attached to Beyblade Arena and is absent from the other seller's list.",
    expectedData: { scope: "seller" },
    endResult: "The coupon is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-coupon-cannot-be-site-wide": {
    roles: ["seller"],
    startPage: "/store/coupons",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's coupon creation form and read every option.",
      "Look for any control that would make the coupon platform-wide or apply it to all stores.",
      "Create one coded QASITEWIDE10 and save.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons, find QASITEWIDE10, and read its scope and store.",
      "Sign back in as tyson and delete it.",
    ],
    inputs: { code: "QASITEWIDE10" },
    expectedBehaviour:
      "A seller cannot mint a platform-wide coupon. There is exactly one platform-wide slot per cart, and a discount in it is paid for across every store — that is an admin decision by definition.",
    expectedUiState:
      "No site-wide or all-stores option is offered. In the admin list the coupon reads as seller-scoped and attached to Beyblade Arena, not as an admin coupon.",
    expectedData: { scope: "seller" },
    endResult: "The coupon is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-coupon-no-stacking-toggle": {
    roles: ["seller"],
    startPage: "/store/coupons",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's coupon creation form and read every field and toggle.",
      "Look for any control about combining with other coupons or with platform coupons.",
      "Open the store's 'How coupons work' help panel if one is offered and read the rules it states.",
      "Compare those rules against what the form lets the seller configure.",
    ],
    expectedBehaviour:
      "Stacking is a platform rule, not a per-coupon setting — one coupon per store plus one platform-wide, unconditionally. The old opt-out toggle was removed because nothing read it, and a control that appears to configure a rule it cannot change is worse than no control.",
    expectedUiState:
      "No combine-with-other-coupons toggle is offered. Any help copy shown states the platform rule rather than implying the seller controls it.",
    endResult: "Read-only; leave the form without saving.",
  },
  "checklist-selling-seller-listing-types-seller-coupon-second-for-same-store-rejected": {
    roles: ["seller", "buyer"],
    startPage: "/store/coupons",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Create two seller coupons on this store: QAFIRST10 at 10% and QASECOND10 at 10%, both with no minimum purchase.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Open /checkout, complete the address and add-ons steps, and apply QAFIRST10.",
      "Apply QASECOND10 and read the error.",
      "Sign back in as tyson and delete both coupons.",
    ],
    inputs: { coupon1: "QAFIRST10", coupon2: "QASECOND10" },
    expectedBehaviour:
      "Two coupons from the same store cannot both apply. The second is refused rather than swapped in — silently replacing the first would change the discount under a buyer who thought they were adding to it.",
    expectedUiState:
      "QAFIRST10 stays applied with its amount unchanged, and the error names it as the coupon already occupying the store's slot. QASECOND10 does not enter the applied list.",
    expectedData: { storeCouponCount: 1 },
    endResult:
      "Both coupons are deleted by the final step, and the cart is emptied.",
  },
  "checklist-selling-seller-listing-types-seller-coupon-stacks-with-admin-coupon": {
    roles: ["seller", "buyer"],
    startPage: "/store/coupons",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and create QASTACK10 at 10% with no minimum purchase.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) and product-beyblade-original-driger-v (₹1,799) to the cart.",
      "Open /checkout, complete the address and add-ons steps, and apply QASTACK10.",
      "Apply FREESHIP499, a platform-wide coupon.",
      "Read the applied list, both discount amounts and the total.",
      "Sign back in as tyson and delete QASTACK10.",
    ],
    inputs: { sellerCoupon: "QASTACK10", adminCoupon: "FREESHIP499" },
    expectedBehaviour:
      "A seller coupon and a platform-wide one occupy different buckets, so both apply at once. This is the positive case the two rejection cases mirror — without it, a rule that refused everything would also pass them.",
    expectedUiState:
      "Both codes are listed, each with its own amount and remove control, and the total falls by the sum. The seller coupon's amount is computed from this store's items only.",
    expectedData: { appliedCouponCount: 2 },
    endResult:
      "The coupon is deleted and the cart emptied by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-coupon-category-restriction-works": {
    roles: ["seller", "buyer"],
    startPage: "/store/coupons",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Create QACAT20 at 20%, restricted to the Beyblade Burst category, with no minimum purchase.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-metal-storm-pegasus (₹1,299, Metal Fight) to the cart alone.",
      "Open /checkout, complete the address and add-ons steps, and apply QACAT20 — read the error.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Burst) and apply QACAT20 again.",
      "Read the discount amount and compare it against 20% of ₹1,399.",
      "Sign back in as tyson and delete QACAT20.",
    ],
    inputs: { code: "QACAT20", percent: 20, burstItemPrice: 1399, metalItemPrice: 1299 },
    expectedBehaviour:
      "The restriction is tested by set intersection against the product's full category chain, and the discount applies only to the eligible items. The category is resolved lazily — the cart snapshots none — so the lookup fires only when a coupon actually carries a restriction.",
    expectedUiState:
      "The Metal-only cart is refused with a message naming the category rather than reading 'Invalid coupon'. With the Burst item added the coupon applies, and its amount is about ₹279.80 — 20% of ₹1,399 — not 20% of the ₹2,698 combined subtotal.",
    expectedData: { eligibleSubtotal: 1399 },
    endResult:
      "The coupon is deleted and the cart emptied by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-bundles-crud": {
    roles: ["seller"],
    startPage: "/store/bundles",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's bundles page and create one named 'QA Bundle seller-crud'.",
      "Add product-beyblade-burst-valkyrie (₹999) and product-beyblade-x-wizard-arrow (₹899) as members, and set the bundle price to 1500.",
      "Save, RELOAD, and read the members, the price and the discount shown.",
      "Attempt to add product-tester-standard-1, which belongs to a different store, as a member and read what happens.",
      "Open the bundle's public page and read its members and price.",
      "Delete the bundle.",
    ],
    inputs: {
      name: "QA Bundle seller-crud",
      member1: "product-beyblade-burst-valkyrie",
      member2: "product-beyblade-x-wizard-arrow",
      bundlePrice: 1500,
      memberTotal: 1898,
    },
    expectedBehaviour:
      "A bundle is all-or-nothing at a locked price below the sum of its members, and its members must come from ONE store — the store id is the key orders split on, so a cross-store bundle produces an order belonging to one seller containing another's products, with no notification, no shipping resolution and no payout for the second. That is refused at SAVE time rather than at add-to-cart, so existing bundles keep working.",
    expectedUiState:
      "After the reload the bundle holds both members at ₹1,500 against a ₹1,898 total, with a discount shown. The cross-store member is refused with a message naming the reason. The public page lists both members rather than reading '0 items'.",
    expectedData: { memberCount: 2, bundlePrice: 1500 },
    endResult: "The bundle is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-classified-crud": {
    roles: ["seller"],
    startPage: "/store/classified",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's classifieds page and create one titled 'QA Classified seller-crud' at 900, city Pune, contact method phone, negotiable off.",
      "Save, RELOAD, and read all four type-specific values.",
      "Edit only the price to 1100, save, RELOAD, and read all four again.",
      "Open the public page and read the purchase panel.",
      "Delete the listing.",
    ],
    inputs: { title: "QA Classified seller-crud", price: 900, city: "Pune", contactMethod: "phone" },
    expectedBehaviour:
      "Classified-specific fields round-trip and the public purchase panel offers the contact path only — classifieds are capability-blocked from the cart entirely, so an Add to Cart here would be a purchase route the checkout cannot honour.",
    expectedUiState:
      "After each reload all four values hold, including negotiable staying off. The public panel offers Make Offer or Request to Buy and no cart control.",
    endResult: "The listing is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-digitalcodes-crud": {
    roles: ["seller"],
    startPage: "/store/digital-codes",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's digital-codes page and create one titled 'QA Digital Code seller-crud' at 350 with auto-claim delivery.",
      "Add three codes to the pool, save, RELOAD, and read the mode and the pool count.",
      "Remove one code, save, RELOAD, and read the pool count.",
      "Open the public page and read the availability shown.",
      "Delete the listing.",
    ],
    inputs: { title: "QA Digital Code seller-crud", price: 350, codeCount: 3 },
    expectedBehaviour:
      "The pool and the delivery mode round-trip, and availability for this type reads the NESTED pool count rather than a separate stock figure — a listing with stock remaining and an empty pool must read as unavailable, which is the one case that proves the right field is being consulted.",
    expectedUiState:
      "After each reload the mode holds and the pool count matches what was saved. The public page's availability follows the pool.",
    expectedData: { codesAvailable: 2 },
    endResult: "The listing is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-live-crud": {
    roles: ["seller"],
    startPage: "/store/live",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's live-items page and create one titled 'QA Live Item seller-crud' at 3000, species Dog, breed Labrador, sex female, age 8 months.",
      "Set the allowed jurisdictions to Maharashtra only.",
      "Attempt to save WITHOUT a video and read the error.",
      "Upload public/test-media/sample-video.mp4 and save.",
      "RELOAD and read every type-specific value including the jurisdiction list.",
      "Open the public page and read the species line and delivery restrictions.",
      "Delete the listing.",
    ],
    inputs: {
      title: "QA Live Item seller-crud",
      price: 3000,
      species: "Dog",
      jurisdictions: "Maharashtra",
      video: "public/test-media/sample-video.mp4",
    },
    expectedBehaviour:
      "A live listing requires a video where every other type treats it as optional, and its jurisdiction list gates who may buy it at all. A list that saves empty silently removes the restriction rather than failing loudly, which is the one failure here with a consequence beyond the page.",
    expectedUiState:
      "The videoless save is refused inline with the typed values preserved. After the reload every field holds, with Maharashtra still selected. The public page states the species line and the delivery restriction.",
    endResult: "The listing is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-prizedraws-crud": {
    roles: ["seller"],
    startPage: "/store/prize-draws",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's prize-draws page and create one titled 'QA Prize Draw seller-crud' at 75 per entry, 20 entries, instant-reveal mode.",
      "Save, RELOAD, and read the mode, the per-entry price and the entry count.",
      "Open the public page and read the purchase panel's wording.",
      "Check the panel describes buying an ENTRY rather than buying the prize.",
      "Delete the listing.",
    ],
    inputs: { title: "QA Prize Draw seller-crud", pricePerEntry: 75, entryCount: 20 },
    expectedBehaviour:
      "A prize draw sells entries at a per-entry price, in one of two modes. The public wording matters as much as the data: a panel reading 'Buy now' beside a price misrepresents what the money buys, and that is a consumer claim rather than a copy preference.",
    expectedUiState:
      "After the reload the mode, price and entry count hold. The public panel names an entry and its per-entry price rather than presenting the prize as the thing being bought.",
    endResult: "The listing is deleted by the final step.",
  },
  "checklist-selling-seller-listing-types-seller-art-stickers-crud": {
    roles: ["seller", "guest"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Create an art listing titled 'QA Art Print seller-crud' at 650 with a size, material, finish and edition size.",
      "Save, RELOAD, and read all four print fields.",
      "Open /stores/store-beyblade-arena/art in a private window and look for the listing.",
      "Read every other card in that tab and check none is an ordinary product.",
      "Create a sticker listing titled 'QA Sticker Sheet seller-crud' at 200 and check it appears in the same tab.",
      "Delete both listings.",
    ],
    inputs: {
      artTitle: "QA Art Print seller-crud",
      artPrice: 650,
      stickerTitle: "QA Sticker Sheet seller-crud",
      stickerPrice: 200,
    },
    expectedBehaviour:
      "Art and stickers are real listing types with their own fields and their own public tab. They were added to the type union and the plugin registry without being added to the repository's alias map, so their queries ran with NO type filter — the tab rendered and returned the whole catalogue, which looks like a working page.",
    expectedUiState:
      "Both listings round-trip their print fields and both appear in the store's Art & Stickers tab. Every card in that tab is an art or sticker listing — an ordinary Beyblade product among them is the dropped-filter failure.",
    expectedData: { ordinaryProductsInTab: 0 },
    endResult: "Both listings are deleted by the final step.",
  },
};
