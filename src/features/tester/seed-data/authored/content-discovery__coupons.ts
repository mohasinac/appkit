/*
 * WHY: Authored six-part procedures for the content-discovery/coupons page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * These are the buyer-facing DISCOVERY cases — browsing, claiming, and the
 * rejection messages. The stacking arithmetic lives on buying/buying-coupons and
 * is not repeated here; a rule tested in two places drifts in one of them.
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
  "checklist-content-discovery-coupons-view-claimed-coupons": {
    roles: ["buyer"],
    startPage: "/user/coupons",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/coupons and read what is listed.",
      "Open /promotions, click the 'Coupons' tab, and claim NEWBLADER.",
      "Open /user/coupons again.",
      "Read the NEWBLADER row — its code, discount, minimum spend and expiry.",
      "Reload the page.",
    ],
    inputs: { coupon: "NEWBLADER" },
    expectedBehaviour:
      "The wallet lists coupons this buyer has claimed, with enough detail to decide whether to use one. An unclaimed coupon has no row here at all, which is why claiming is part of the procedure rather than an assumption.",
    expectedUiState:
      "Before claiming, the page either lists previously-claimed coupons or shows a named empty state — not a blank panel. After claiming, a NEWBLADER row appears carrying its code, its discount, any minimum spend and an expiry date. Values reading 'undefined' or 'NaN%' are the shape failure to watch for, since the card reads both a flat and a nested coupon shape.",
    endResult: "The NEWBLADER row survives the reload.",
  },
  "checklist-content-discovery-coupons-coupon-discount-applied": {
    roles: ["buyer"],
    startPage: "/promotions",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /promotions, click the 'Coupons' tab, and read the ARENA25 card's stated discount and minimum spend.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Read the discount amount applied and compare it with what the card promised.",
    ],
    inputs: { coupon: "ARENA25", itemPrice: 1399 },
    expectedBehaviour:
      "The discount a public card advertises is the discount checkout applies. A card that states a percentage while checkout applies a cap the card never mentioned is a promise the corpus cannot keep.",
    expectedUiState:
      "The applied amount matches the card's stated terms, including any maximum-discount cap the card should also be stating. ARENA25 appears in the applied list with no error.",
    endResult:
      "Reloading /checkout shows the same coupon and amount. A discrepancy between the card and the applied amount is a copy bug at minimum and a pricing bug at worst.",
  },
  "checklist-content-discovery-coupons-coupon-expired-rejected": {
    roles: ["buyer"],
    startPage: "/checkout",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type TESTEREXPIRED in the coupon field and click 'Apply'.",
      "Read the exact wording of the rejection.",
    ],
    inputs: { coupon: "TESTEREXPIRED" },
    expectedBehaviour:
      "An expired coupon is refused with a reason that names expiry specifically. TESTEREXPIRED is seeded with an end date a day in the past and isActive still true, so this exercises the date check rather than the active flag — the two are separate reasons and a single generic message cannot tell a buyer which applies.",
    expectedUiState:
      "The rejection names expiry, in the shape 'This coupon has expired'. It does not read 'Invalid coupon', which would leave the buyer retyping a code that will never work. TESTEREXPIRED does not enter the applied list.",
    expectedData: { couponApplied: false },
    endResult: "Reloading /checkout shows TESTEREXPIRED absent.",
  },
  "checklist-content-discovery-coupons-coupon-below-min-purchase": {
    roles: ["buyer"],
    startPage: "/checkout",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-tester-standard-3 (₹99) to the cart and nothing else.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Read the exact wording of the rejection and whether it names the required amount.",
    ],
    inputs: { coupon: "ARENA25", cartSubtotal: 99, minPurchase: 1000 },
    expectedBehaviour:
      "A coupon below its minimum spend is refused with a message that names the threshold, so the buyer knows how much more to add. The minimum is measured against the items the coupon could actually discount, not the whole cart.",
    expectedUiState:
      "The rejection names a minimum purchase and states the amount. It is not a bare 'Invalid coupon'. ARENA25 does not enter the applied list.",
    expectedData: { couponApplied: false },
    endResult: "Reloading /checkout shows ARENA25 absent.",
  },
  "checklist-content-discovery-coupons-coupon-not-combinable": {
    roles: ["buyer"],
    startPage: "/checkout",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Open /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click 'Apply'.",
      "Type ARENAVIP in the coupon field and click 'Apply'.",
      "Read the rejection and check whether it names the coupon already holding the slot.",
      "Open the 'How coupons work' panel and read whether its rules match what just happened.",
    ],
    inputs: { coupon1: "ARENA25", coupon2: "ARENAVIP" },
    expectedBehaviour:
      "Both are seller coupons on the same store, and the rule is one per store — so the second is refused. The refusal must name the coupon occupying the slot, otherwise the buyer cannot tell which one to remove.",
    expectedUiState:
      "ARENA25 stays applied with its amount unchanged. The rejection names ARENA25 as the blocker. The help panel's stated rules match the behaviour just observed — a panel describing rules the code does not enforce is worse than no panel.",
    expectedData: { storeCouponCount: 1 },
    endResult: "Reloading /checkout shows ARENA25 applied and ARENAVIP absent.",
  },
  "checklist-content-discovery-coupons-coupon-per-user-limit": {
    roles: ["buyer"],
    startPage: "/checkout",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart.",
      "Open /checkout, complete the address and add-ons steps, apply TESTERLIMITED, and place the order with Cash on Delivery.",
      "Add product-beyblade-metal-storm-pegasus (₹1,299) to the cart.",
      "Open /checkout, complete the address and add-ons steps, and type TESTERLIMITED in the coupon field.",
      "Read the rejection.",
      "Sign out, sign in as rehan.sheikh@gmail.com / TempPass123!, add the same item, and apply TESTERLIMITED at checkout.",
    ],
    inputs: { coupon: "TESTERLIMITED", perUserLimit: 1 },
    expectedBehaviour:
      "TESTERLIMITED allows one use per user and has no global limit, so exhausting it for one buyer must leave it fully usable for the next. Enforcing a per-user limit as if it were global would withdraw the coupon from everybody after a single redemption.",
    expectedUiState:
      "The second attempt by the same buyer is refused with a limit-reached message. The DIFFERENT buyer's attempt is accepted and the coupon appears in their applied list. A refusal for the second buyer means the limit is being read as global.",
    expectedData: { perUserLimit: 1 },
    endResult:
      "One order carries the discount and a second buyer can still use the code. The cross-account half is the case — the same-account half alone passes under either reading.",
  },
};
