/*
 * WHY: Authored six-part procedures for the buying/buying-coupons checklist page.
 * WHAT: 20 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE MULTI-STORE CART IS 2 × prizedraw-beyblade-original-vintage-vault (₹299
 * each = ₹598, store-letitrip-official) ALONGSIDE A BEYBLADE ARENA ITEM. Earlier
 * drafts said "a LetItRip Official item worth ≥₹500", which does not exist —
 * every store-letitrip-official fixture is a prize draw and none reaches ₹500 on
 * its own. A prize draw is cart-capable and its quantity is the entry count, so
 * two entries clear OFFICIAL10's ₹500 minimum with real seeded data. Two
 * fixture-request ledger entries asked for a new product for exactly this; they
 * did not need one.
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
  "checklist-buying-buying-coupons-coupon-all-codes-listed-on-order": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) and product-beyblade-metal-storm-pegasus (₹1,299) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type FREESHIP499 in the coupon field and click 'Apply'.",
      "Choose Cash on Delivery and place the order.",
      "Open /user/orders and open the order just created.",
      "Open the invoice for the same order.",
    ],
    inputs: { coupon1: "ARENA25", coupon2: "FREESHIP499" },
    expectedBehaviour:
      "The order records the full stack in its own discounts array, and both the receipt and the invoice render from that array. The two legacy single-coupon scalar fields still exist for older orders, and rendering from those instead is what silently drops every code after the first.",
    expectedUiState:
      "The order page shows two separate discount lines, one naming ARENA25 with its amount and one naming FREESHIP499 with its own. The invoice shows the same two. Neither shows a single combined 'Discount' line, and neither shows ARENA25 alone.",
    expectedData: { discountLineCount: 2 },
    endResult:
      "Both lines are still there after a reload of each page. One line where two coupons were applied means the second code was never carried onto the order.",
  },
  "checklist-buying-buying-coupons-coupon-auction-offer-lane-no-coupon-field": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /cart and click the 'Won Auctions' tab.",
      "Click 'Proceed to checkout' from that tab.",
      "Read the whole checkout page, looking for a coupon input and the 'How coupons work' panel.",
      "Go back to /cart and click the 'Accepted Offers' tab.",
      "Click 'Proceed to checkout' from that tab.",
      "Read the whole checkout page the same way.",
    ],
    expectedBehaviour:
      "In the auction and offer lanes the price was already agreed — by a winning bid or an accepted offer — so a coupon has nothing to discount and the input is not rendered at all. Rendering it and rejecting whatever is typed would be worse: it invites the buyer to hunt for a code that can never work.",
    expectedUiState:
      "Neither lane shows a coupon input or a 'How coupons work' panel. Each shows an explanatory banner in the shape of 'You're paying for your Auction wins. The price is already agreed, so coupons don't apply and the rest of your cart stays where it is.'",
    endResult:
      "Display-only; nothing persists. Requires the tester account to hold a won auction and an accepted offer, both of which the sandbox seeds.",
  },
  "checklist-buying-buying-coupons-coupon-category-restriction-accepts-matching-cart": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-metal-storm-pegasus (₹1,299, Metal Fight) to the cart.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Burst) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type SEALED20 in the coupon field and click 'Apply'.",
      "Read the discount amount shown beside SEALED20.",
    ],
    inputs: { coupon: "SEALED20", burstItemPrice: 1399, metalItemPrice: 1299 },
    expectedBehaviour:
      "SEALED20 is restricted to the Burst and X categories, and the cart now holds a Burst item, so it applies — but only to that item. Products carry their full ancestor chain in categorySlugs, so the eligibility test is a set intersection, not a single-slug equality.",
    expectedUiState:
      "SEALED20 appears in the applied list with no error. Its discount is 20% of ₹1,399 — about ₹279.80 — not 20% of the ₹2,698 combined subtotal. A discount near ₹539 means the restriction was ignored and the Metal item was discounted too.",
    expectedData: { eligibleSubtotal: 1399 },
    endResult:
      "Reloading /checkout shows SEALED20 still applied at the Burst-only amount.",
  },
  "checklist-buying-buying-coupons-coupon-category-restriction-rejects-non-matching-cart": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-metal-storm-pegasus (₹1,299, Metal Fight) to the cart and nothing else.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type SEALED20 in the coupon field and click 'Apply'.",
    ],
    inputs: { coupon: "SEALED20", itemPrice: 1299 },
    expectedBehaviour:
      "With only Metal-generation items in the cart, nothing intersects SEALED20's Burst and X restriction, so it is refused. The category is resolved lazily — the cart snapshots no category, so the check fetches one only when a coupon actually carries a category restriction, and this is that case.",
    expectedUiState:
      "An error explains that the coupon does not apply to the items in the cart. SEALED20 does not appear in the applied list. The error names the reason rather than reading simply 'Invalid coupon'.",
    expectedData: { couponApplied: false },
    endResult: "Reloading /checkout shows SEALED20 absent.",
  },
  "checklist-buying-buying-coupons-coupon-expired-in-cart-dropped-at-placement": {
    roles: ["buyer", "admin"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! in window A.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /checkout, complete the address and add-ons steps, type ARENA25 in the coupon field and click 'Apply'.",
      "Read the ARENA25 discount amount and the order total, and leave the page open without reloading it.",
      "In window B, sign in as admin@letitrip.in / TempPass123! and open /admin/coupons.",
      "Open ARENA25 and set it to inactive, then save.",
      "Return to window A without reloading and place the order with Cash on Delivery.",
      "Open /user/orders and open the order just created.",
    ],
    inputs: { coupon: "ARENA25" },
    expectedBehaviour:
      "Every applied coupon is re-checked against the items actually being ordered at placement time, not trusted from the amount frozen on the cart when it was applied. A coupon that lapsed while it sat there is dropped and reported — never allowed to silently discount the order, and never allowed to fail the whole checkout, since the buyer is on the payment step and cannot fix a lapsed coupon from there.",
    expectedUiState:
      "The order is placed. A message at placement, or on the order, says ARENA25 was removed because it was no longer valid. The order page has no ARENA25 discount line and its total is the undiscounted one — not the total shown in window A before the coupon lapsed.",
    expectedData: { arena25OnOrder: false },
    endResult:
      "Reactivate ARENA25 in /admin/coupons afterwards; other cases apply it. An order that kept the discount means placement trusted the cart's frozen amount.",
  },
  "checklist-buying-buying-coupons-coupon-help-visible-cart": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /cart and find the Order Summary panel.",
      "Read the collapsed disclosure labelled 'How coupons work' with its 'Stacking rules' sub-label.",
      "Click that disclosure header.",
      "Look for a coupon input anywhere on the page.",
    ],
    expectedBehaviour:
      "The cart explains the stacking rules but takes no codes — codes are entered at checkout only. One place to type a coupon means one place for it to be wrong.",
    expectedUiState:
      "The disclosure opens to three sections: 'You can use more than one coupon', 'Where each discount lands', and 'Why a coupon might not apply'. There is no coupon input and no Apply button anywhere on /cart.",
    endResult:
      "The expanded state is UI-only and the disclosure is collapsed again after a reload.",
  },
  "checklist-buying-buying-coupons-coupon-help-visible-checkout": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Find the coupon input and the 'How coupons work' panel beneath it.",
      "Click the disclosure header.",
      "Read every sentence and compare them with the cart version.",
    ],
    expectedBehaviour:
      "The checkout copy is the cart copy plus one sentence about revalidation, because revalidation is a checkout-time behaviour and stating it in the cart would describe something that has not happened yet.",
    expectedUiState:
      "The same three sections as the cart, plus a sentence in the shape of 'Coupons are re-checked when you place the order. If one has expired or run out while it sat in your cart, it's removed and your total is recalculated before payment.' A coupon input with an 'Apply' button sits above the panel.",
    endResult: "UI-only; the disclosure is collapsed again after a reload.",
  },
  "checklist-buying-buying-coupons-coupon-help-visible-listing": {
    roles: ["guest"],
    startPage: "/promotions",
    steps: [
      "Open /promotions and click the 'Coupons' tab.",
      "Click the 'How coupons work' disclosure above the coupon grid.",
      "Read all three sections and note their exact wording.",
      "Open /stores/store-beyblade-arena and go to its coupons tab.",
      "Click the 'How coupons work' disclosure there.",
      "Read all three sections and compare them word for word with what was noted.",
    ],
    expectedBehaviour:
      "All four surfaces — promotions, store coupons, cart and checkout — render the same copy from one constant. Buyer-facing rules that drift between pages teach buyers to distrust the page they are on.",
    expectedUiState:
      "Both disclosures read 'How coupons work' with the sub-label 'Stacking rules', and their three sections carry identical bullet text. Any wording difference between the two is the failure, however small.",
    endResult: "UI-only; nothing persists.",
  },
  "checklist-buying-buying-coupons-coupon-min-purchase-uses-eligible-subtotal": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-valkyrie (₹999, Beyblade Arena) to the cart.",
      "Add prizedraw-beyblade-original-vintage-vault (₹299, LetItRip Official) to the cart and set its quantity to 2, making ₹598 from that store.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
    ],
    inputs: { coupon: "ARENA25", arenaSubtotal: 999, otherStoreSubtotal: 598, cartTotal: 1597 },
    expectedBehaviour:
      "The ₹1,000 minimum is measured against the items the coupon could actually discount — ₹999 of Beyblade Arena stock — not against the ₹1,597 cart total. Measuring the whole cart would let a buyer unlock a store's coupon by adding another store's items.",
    expectedUiState:
      "ARENA25 is refused with a minimum-purchase message and does not appear in the applied list, even though the cart total is comfortably over ₹1,000.",
    expectedData: { couponApplied: false },
    endResult:
      "Reloading /checkout shows ARENA25 absent. Acceptance here means the minimum was tested against the cart total.",
  },
  "checklist-buying-buying-coupons-coupon-persists-across-reload": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type FREESHIP499 in the coupon field and click 'Apply'.",
      "Read both discount amounts.",
      "Reload /checkout and read them again.",
      "Open /cart, then open /checkout again, and read them a third time.",
    ],
    inputs: { coupon1: "ARENA25", coupon2: "FREESHIP499" },
    expectedBehaviour:
      "Applied coupons live on the cart document server-side, so they survive a reload and a navigation away and back. Holding them in component state would lose them on any of the three.",
    expectedUiState:
      "Both codes are listed with the same amounts on all three readings. Losing one after the cart round-trip is as much a failure as losing it on reload.",
    endResult:
      "Both coupons are still applied at the end with unchanged amounts.",
  },
  "checklist-buying-buying-coupons-coupon-remove-one-of-many": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) and product-beyblade-metal-storm-pegasus (₹1,299) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type FREESHIP499 in the coupon field and click 'Apply'.",
      "Read the FREESHIP499 discount amount and the order total.",
      "Click the remove control beside FREESHIP499.",
      "Read the order total again.",
    ],
    inputs: { coupon1: "ARENA25", coupon2: "FREESHIP499" },
    expectedBehaviour:
      "Removing one coupon leaves the other applied and recomputes the total by exactly the removed amount. A removal that clears the whole stack, or that removes the row without recomputing, are the two failures here.",
    expectedUiState:
      "The applied list holds ARENA25 only. The total has risen by precisely the FREESHIP499 amount read before removal — not by a different figure, and not unchanged.",
    expectedData: { remainingCouponCount: 1 },
    endResult: "Reloading /checkout shows ARENA25 applied and FREESHIP499 gone.",
  },
  "checklist-buying-buying-coupons-coupon-split-across-per-store-orders": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Add prizedraw-beyblade-original-vintage-vault (₹299, LetItRip Official) and set its quantity to 2.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type FREESHIP499 in the coupon field and click 'Apply'.",
      "Read the FREESHIP499 discount total, then place the order with Cash on Delivery.",
      "Open /user/orders and open the Beyblade Arena order.",
      "Open the LetItRip Official order.",
      "Add the FREESHIP499 amounts from both orders together and compare with the checkout figure.",
    ],
    inputs: { storeCoupon: "ARENA25", globalCoupon: "FREESHIP499" },
    expectedBehaviour:
      "A cart splits into one order per store, so a store coupon lands only on its own store's order while a platform coupon is prorated across both by their share of the subtotal. The prorated parts must reconcile exactly to what the buyer was shown, or the platform absorbed or overcharged the difference.",
    expectedUiState:
      "ARENA25 appears on the Beyblade Arena order and NOT on the LetItRip Official one. FREESHIP499 appears on both, and the two amounts sum to the single figure shown at checkout — not to more, and not to less.",
    expectedData: { orderCount: 2 },
    endResult:
      "Both orders keep their discount lines after a reload, and the reconciliation still holds.",
  },
  "checklist-buying-buying-coupons-coupon-stack-duplicate-code-rejected": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type ARENA25 in the coupon field again and click 'Apply'.",
      "Read the applied list and the order total.",
    ],
    inputs: { coupon: "ARENA25" },
    expectedBehaviour:
      "The same code cannot occupy its bucket twice. The dangerous failure is not the duplicate row but the doubled discount that would come with it.",
    expectedUiState:
      "ARENA25 appears exactly once. An error says it is already applied. The total is unchanged from after the first application.",
    expectedData: { arena25RowCount: 1 },
    endResult: "Reloading /checkout shows a single ARENA25 entry.",
  },
  "checklist-buying-buying-coupons-coupon-stack-second-global-rejected": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) and product-beyblade-original-driger-v (₹1,799) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type FREESHIP499 in the coupon field and click 'Apply'.",
      "Type BLADER50 in the coupon field and click 'Apply'.",
      "Read the error and the applied list.",
      "Click the remove control beside FREESHIP499.",
      "Type BLADER50 in the coupon field and click 'Apply'.",
    ],
    inputs: { globalCoupon1: "FREESHIP499", globalCoupon2: "BLADER50" },
    expectedBehaviour:
      "There is exactly one platform-wide slot. The second half of this case is the important half: freeing the slot must make the previously-refused code acceptable, proving the rejection was a slot conflict and not the code being invalid.",
    expectedUiState:
      "The second apply is refused with a message naming FREESHIP499 as the coupon already holding the slot, in the shape of 'Only one platform-wide coupon can be applied at a time (FREESHIP499). Remove it first.' After removing it, BLADER50 is accepted and appears in the list with its discount.",
    expectedData: { globalCouponCount: 1 },
    endResult: "Reloading /checkout shows BLADER50 applied and FREESHIP499 gone.",
  },
  "checklist-buying-buying-coupons-coupon-stack-second-store-coupon-rejected": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type SEALED20 in the coupon field and click 'Apply'.",
      "Read the error and the applied list.",
    ],
    inputs: { storeCoupon1: "ARENA25", storeCoupon2: "SEALED20" },
    expectedBehaviour:
      "One store coupon per store. The second is refused rather than swapped in — silently replacing the first would change the discount under a buyer who thought they were adding to it.",
    expectedUiState:
      "ARENA25 is still applied and its amount is unchanged. The error names it, in the shape of 'A coupon for this store is already applied (ARENA25). Remove it first.' SEALED20 is not in the list.",
    expectedData: { storeCouponCount: 1 },
    endResult: "Reloading /checkout shows ARENA25 applied and SEALED20 absent.",
  },
  "checklist-buying-buying-coupons-coupon-stack-two-stores-plus-global": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Add prizedraw-beyblade-original-vintage-vault (₹299, LetItRip Official) and set its quantity to 2, making ₹598 from that store.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type OFFICIAL10 in the coupon field and click 'Apply'.",
      "Type FREESHIP499 in the coupon field and click 'Apply'.",
      "Read the applied list and the order total.",
    ],
    inputs: {
      arenaCoupon: "ARENA25",
      officialCoupon: "OFFICIAL10",
      globalCoupon: "FREESHIP499",
      officialSubtotal: 598,
    },
    expectedBehaviour:
      "The buckets are one coupon per store plus one platform-wide, so a two-store cart legitimately carries three coupons at once. This is the positive case the two rejection cases above are the mirror of — without it, a rule that refused everything would also pass them.",
    expectedUiState:
      "Three rows are listed, each with its own amount and its own remove control: ARENA25, OFFICIAL10 and FREESHIP499. No error appears. The total falls by the sum of the three.",
    expectedData: { appliedCouponCount: 3 },
    endResult:
      "All three survive a reload with the same amounts. The ₹598 from two prize-draw entries is what clears OFFICIAL10's ₹500 minimum — a single entry at ₹299 would be refused, and that refusal would look like a stacking failure.",
  },
  "checklist-buying-buying-coupons-coupon-store-scope-limited-to-its-own-items": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Add prizedraw-beyblade-original-vintage-vault (₹299, LetItRip Official) and set its quantity to 2.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Read the ARENA25 discount amount and the cart total.",
      "Open /cart, remove the prize-draw line, and open /checkout again.",
      "Read the ARENA25 discount amount and the cart total again.",
    ],
    inputs: { coupon: "ARENA25", arenaSubtotal: 1399 },
    expectedBehaviour:
      "A store coupon discounts only its own store's items, so removing another store's items changes the cart total and leaves the discount untouched. A discount that moves with the whole-cart total is being applied across stores.",
    expectedUiState:
      "The ARENA25 amount is identical in both readings. The cart total is lower in the second. A changed discount amount is the failure.",
    expectedData: { discountBasis: 1399 },
    endResult:
      "Reloading /checkout shows the same Arena-only discount amount.",
  },
  "checklist-buying-buying-coupons-coupon-summary-total-matches-sum": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) and product-beyblade-metal-storm-pegasus (₹1,299) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type FREESHIP499 in the coupon field and click 'Apply'.",
      "Write down each coupon's own discount amount from the applied list.",
      "Write down the Order Summary's discount line, subtotal, shipping, fees, GST and Total.",
      "Add the two coupon amounts and compare with the discount line, then check the Total against the other figures.",
    ],
    inputs: { coupon1: "ARENA25", coupon2: "FREESHIP499" },
    expectedBehaviour:
      "The per-coupon amounts and the summary line come from the same computation, so they reconcile exactly. A summary that is computed separately from the rows is how a buyer is shown one figure and charged another.",
    expectedUiState:
      "The two per-coupon amounts add up to the summary discount line to the paisa. The Total equals subtotal minus that discount, plus shipping, fees and GST. Any rounding gap is a fail, not a rounding artefact.",
    endResult:
      "Reloading /checkout reproduces every figure, confirming they are computed rather than left over in component state.",
  },
  "checklist-buying-buying-coupons-coupon-usage-limit-increments-after-order": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as claude-tester@letitrip.in / TempPass123!, which carries canTestAdmin.",
      "Open /admin/coupons, find TESTERLIMITED, and write down its current usage count.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /checkout, complete the address and add-ons steps, type TESTERLIMITED in the coupon field, click 'Apply', and place the order with Cash on Delivery.",
      "Open /admin/coupons and read TESTERLIMITED's usage count again.",
      "Add product-beyblade-metal-storm-pegasus (₹1,299) to the cart.",
      "Open /checkout, complete the address and add-ons steps, type TESTERLIMITED in the coupon field, and click 'Apply'.",
    ],
    inputs: { coupon: "TESTERLIMITED", perUserLimit: 1, discountPercent: 10, maxDiscount: 100 },
    expectedBehaviour:
      "Redemption is counted per user as well as globally, and the per-user count is written at checkout as a side effect of applying the coupon. TESTERLIMITED is perUserLimit 1 with no total limit, so this case is about per-user exhaustion: the SAME buyer's second attempt is refused while the coupon itself stays live for everyone else.",
    expectedUiState:
      "The usage count in /admin/coupons is exactly one higher after the order. The second apply, by the same account, is refused with a limit-reached message and TESTERLIMITED does not enter the applied list. The coupon still shows as active in the admin list — it is exhausted for this user, not withdrawn.",
    expectedData: { perUserLimit: 1, usageIncrement: 1 },
    endResult:
      "The incremented count persists in /admin/coupons after a reload. A count that does not move means the per-user usage write is fire-and-forget and failed silently.",
  },
  "checklist-buying-buying-coupons-coupon-wallet-apply-lands-on-checkout": {
    roles: ["buyer"],
    startPage: "/promotions",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /promotions, click the 'Coupons' tab, and claim ARENA25.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /user/coupons.",
      "Click 'Use' on the ARENA25 row.",
      "Read where the browser lands and what the coupon section shows.",
    ],
    inputs: { coupon: "ARENA25" },
    expectedBehaviour:
      "'Use' carries the code through to checkout and applies it, rather than dropping the buyer on a page where they must retype it. If it cannot apply to the current cart the reason is shown — a button that navigates and silently does nothing is worse than no button.",
    expectedUiState:
      "The browser ends on /checkout with ARENA25 already in the applied list and its discount showing. With an empty or ineligible cart, an explanatory message names the reason instead.",
    endResult:
      "The pre-applied coupon survives a reload of /checkout. The claim step at the start is required: /user/coupons is the wallet, and an unclaimed coupon has no row there to press 'Use' on.",
  },
};
