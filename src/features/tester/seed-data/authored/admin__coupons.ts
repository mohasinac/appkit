/*
 * WHY: Authored six-part procedures for the admin/coupons page.
 * WHAT: 11 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THIS ROUTE ONCE ACCEPTED EVERY EDIT AND WROTE NOTHING. The handler returned a
 * 200 echoing the submission back while only activate and deactivate reached a
 * repository write — so a changed name, discount, limit or validity looked saved,
 * looked correct on screen, and was gone on reload. That is why
 * coupon-admin-edit-actually-saves exists and why nearly every case here ends in
 * a reload rather than a confirmation message.
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
  "checklist-admin-coupons-coupon-create-percentage": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and create a percentage coupon coded QAADMIN15 at 15%, maximum discount 200, minimum purchase 500, valid for a week.",
      "Save, RELOAD, and read every field.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-original-driger-v (₹1,799) to the cart and reach the checkout coupon step.",
      "Apply QAADMIN15 and read the discount amount.",
      "Compare it against 15% of ₹1,799 and against the ₹200 cap.",
    ],
    inputs: { code: "QAADMIN15", percent: 15, maxDiscount: 200, minPurchase: 500, itemPrice: 1799 },
    expectedBehaviour:
      "A percentage coupon applies its rate and then its cap. 15% of ₹1,799 is ₹269.85, above the ₹200 maximum, so the cap is what the buyer receives — a cap that is stored and not applied is invisible until a large enough cart reaches it.",
    expectedUiState:
      "After the reload every field holds. At checkout the discount is ₹200.00, not ₹269.85. A discount of ₹269.85 means the cap was ignored.",
    expectedData: { appliedDiscount: 200 },
    endResult: "Leave the coupon in place — later cases read it.",
  },
  "checklist-admin-coupons-coupon-create-fixed-freeship-bxgy": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and read every coupon TYPE the form offers.",
      "Create a fixed-amount coupon coded QAFIXED100 at ₹100 off with no minimum, and save.",
      "Create a free-shipping coupon coded QAFREESHIP with no minimum, and save.",
      "Create a buy-X-get-Y coupon coded QABXGY if the form offers that type, and save.",
      "RELOAD each and read its type and settings.",
      "As vivaan.kapoor@gmail.com / TempPass123!, apply each in turn at checkout and read what each changes.",
      "Delete all three.",
    ],
    inputs: { fixedCode: "QAFIXED100", fixedAmount: 100, freeShipCode: "QAFREESHIP", bxgyCode: "QABXGY" },
    expectedBehaviour:
      "Each type does something different at checkout: fixed reduces the subtotal by a flat amount, free shipping zeroes the shipping line specifically, and buy-X-get-Y discounts by quantity. A type that saves but behaves identically to another has not been implemented, only listed.",
    expectedUiState:
      "The fixed coupon reduces the subtotal by ₹100. The free-shipping one zeroes the SHIPPING line rather than the subtotal — a free-shipping coupon that takes its value off the subtotal is the failure worth naming. Buy-X-get-Y changes the total by quantity.",
    endResult: "All three coupons are deleted by the final step.",
  },
  "checklist-admin-coupons-coupon-per-user-limit-enforced": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons, find TESTERLIMITED, and read its per-user limit, total limit and current usage.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! and place an order applying TESTERLIMITED.",
      "Attempt a second order applying it again and read the refusal.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and apply TESTERLIMITED at checkout.",
      "Sign back in as admin and read the usage count.",
    ],
    inputs: { code: "TESTERLIMITED", perUserLimit: 1 },
    expectedBehaviour:
      "TESTERLIMITED is one use per user with NO total limit, so exhausting it for one buyer must leave it fully usable by the next. Enforcing a per-user limit as if it were global withdraws the coupon from everybody after a single redemption.",
    expectedUiState:
      "The same buyer's second attempt is refused with a limit message. A DIFFERENT buyer's attempt is accepted. The admin usage count has risen by the number of redemptions, and the coupon still reads as active.",
    expectedData: { perUserLimit: 1 },
    endResult:
      "The cross-account half is the case — the same-account half alone passes under either reading.",
  },
  "checklist-admin-coupons-coupon-min-max-discount": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and confirm QAADMIN15 has a minimum purchase of 500 and a maximum discount of 200.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-tester-standard-3 (₹99) to the cart alone and apply QAADMIN15 at checkout.",
      "Read the refusal and whether it names the required amount.",
      "Add product-beyblade-original-driger-v (₹1,799) so the subtotal clears the minimum, and apply again.",
      "Read the discount amount.",
      "Type 799.50 into a money field elsewhere in the coupon form and check a decimal is accepted.",
    ],
    inputs: { code: "QAADMIN15", minPurchase: 500, maxDiscount: 200 },
    expectedBehaviour:
      "The minimum gates whether the coupon applies at all and the maximum caps what it gives. The minimum is measured against the items the coupon could actually discount rather than the whole cart, and money is decimal rupees throughout — a validator rejecting 799.50 as a non-integer is a leftover from the old whole-number storage.",
    expectedUiState:
      "Below the minimum the coupon is refused with a message naming the threshold, not a bare 'Invalid coupon'. Above it the discount is capped at ₹200.00. A decimal amount is accepted in the coupon form.",
    endResult: "Nothing is ordered; leave checkout without placing.",
  },
  "checklist-admin-coupons-coupon-scope-admin-vs-seller": {
    roles: ["admin"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and read the scope shown on every row.",
      "Filter or sort by scope if the list offers it, and read the results.",
      "Open a seller-scoped coupon and read which store it belongs to.",
      "Open an admin-scoped coupon and read whether it names a store at all.",
      "Read whether the admin can change a coupon's scope after creation.",
    ],
    expectedBehaviour:
      "There are exactly two scopes and no third: platform-wide with no store, or seller-scoped to one store. The distinction decides which stacking bucket a coupon occupies at checkout, so a row that does not show its scope hides the one field that determines its behaviour.",
    expectedUiState:
      "Every row shows its scope. Seller-scoped coupons name their store; admin-scoped ones do not name any. Any scope filter returns rows for both values.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-coupons-coupon-expire-reject": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and find TESTEREXPIRED, reading its end date and its active flag.",
      "Note that it is still marked active while its end date is in the past.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! and apply TESTEREXPIRED at checkout.",
      "Read the exact wording of the refusal.",
      "Sign back in as admin, deactivate an ACTIVE coupon, and apply that one as the buyer.",
      "Compare the two refusal messages.",
    ],
    inputs: { expiredCode: "TESTEREXPIRED" },
    expectedBehaviour:
      "Expiry and deactivation are two separate reasons and both refuse. TESTEREXPIRED is seeded past its end date while still flagged active precisely so the DATE check is exercised rather than the flag — a validator reading only the flag would accept it.",
    expectedUiState:
      "The expired coupon is refused with a message naming expiry. The deactivated one is refused with a different message. Two identical generic refusals mean only one of the two checks is running.",
    endResult:
      "Reactivate the coupon that was deactivated. Leaving it off silently breaks every later case that applies it.",
  },
  "checklist-admin-coupons-coupon-admin-is-platform-wide": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and confirm QAADMIN15 is admin-scoped with no store.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Add prizedraw-beyblade-original-vintage-vault (₹299, LetItRip Official) and set its quantity to 2.",
      "Apply QAADMIN15 at checkout and read the discount.",
      "Place the order and open both resulting orders in /user/orders.",
      "Read the QAADMIN15 amount on each and add them together.",
    ],
    inputs: { code: "QAADMIN15", arenaSubtotal: 1399, officialSubtotal: 598 },
    expectedBehaviour:
      "A platform coupon applies across the whole cart and is then prorated across the per-store orders by their share of the subtotal. The parts must reconcile exactly to what the buyer was shown, or the platform absorbed or overcharged the difference.",
    expectedUiState:
      "The discount is computed against the combined subtotal rather than one store's. Both orders carry a share of it and the two shares sum to the single figure shown at checkout — not to more, and not to less.",
    expectedData: { orderCount: 2 },
    endResult:
      "Two orders exist, each with its prorated share. The reconciliation is the assertion.",
  },
  "checklist-admin-coupons-coupon-admin-no-stacking-toggle": {
    roles: ["admin"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and start creating a coupon.",
      "Read every field and toggle the form offers.",
      "Look for any control about combining with seller coupons or with other platform coupons.",
      "Open an existing coupon's editor and look for the same.",
    ],
    expectedBehaviour:
      "Stacking is a platform rule, not a per-coupon setting — one coupon per store plus one platform-wide, unconditionally. The old combine-with-seller-coupons opt-out was removed because nothing read it, and a control that appears to configure a rule it cannot change is worse than no control at all.",
    expectedUiState:
      "No stacking or combinability toggle is offered on either the create or the edit form. A toggle present here is the finding, whether or not it saves.",
    endResult: "Read-only; leave the form without saving.",
  },
  "checklist-admin-coupons-coupon-admin-category-restriction-enforced": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Create a coupon coded QACATADMIN20 at 20%, restricted to the Beyblade Burst category, no minimum.",
      "Save, RELOAD, and confirm the restriction persisted.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-metal-storm-pegasus (₹1,299, Metal Fight) alone and apply QACATADMIN20 — read the refusal.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Burst) and apply again.",
      "Read the discount and compare it against 20% of ₹1,399.",
      "Sign back in as admin and delete the coupon.",
    ],
    inputs: { code: "QACATADMIN20", percent: 20, burstPrice: 1399, metalPrice: 1299 },
    expectedBehaviour:
      "The restriction is tested by set intersection against each product's full category chain, and the discount covers only the eligible items. The category is fetched lazily — the cart snapshots none — so the lookup fires only when a coupon actually carries a restriction, and the common case costs no extra reads.",
    expectedUiState:
      "The Metal-only cart is refused with a message naming the category. With the Burst item added the coupon applies at about ₹279.80 — 20% of ₹1,399 — not 20% of the ₹2,698 combined subtotal.",
    expectedData: { eligibleSubtotal: 1399 },
    endResult: "The coupon is deleted by the final step.",
  },
  "checklist-admin-coupons-coupon-admin-edit-actually-saves": {
    roles: ["admin"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and open QAADMIN15's editor.",
      "Write down every field: name, description, discount, maximum, minimum, usage limits and both validity dates.",
      "Change the NAME and the discount percentage, and save.",
      "Read the confirmation message.",
      "RELOAD the editor and compare every field against what was written down.",
      "Change only the validity end date, save, RELOAD, and check the start date is still there.",
      "Use the deactivate action, then reactivate it, reloading after each.",
    ],
    inputs: { code: "QAADMIN15" },
    expectedBehaviour:
      "🛑 This is the case the page exists for. The handler once returned a 200 echoing the submission while only activate and deactivate reached a repository write — so a changed name, discount, limit or date looked saved and was gone on reload, with no error to notice. The validity object must also MERGE rather than replace: sending one sub-field wholesale wipes the other date.",
    expectedUiState:
      "After the reload the new name and discount are present. After the end-date edit the start date is unchanged. Deactivate and reactivate both persist. A success message followed by the ORIGINAL values after reload is the exact failure, and without the reload the screen looks identical either way.",
    expectedData: { changesPersisted: true },
    endResult:
      "Restore QAADMIN15's original name and percentage, or delete it. This case cannot be judged from the confirmation message — only from the reload.",
  },
  "checklist-admin-coupons-coupon-admin-usage-visible": {
    roles: ["admin", "buyer"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and read the usage figure on every row.",
      "Note the figure for ARENA25.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! and place an order applying ARENA25.",
      "Sign back in as admin and read ARENA25's usage figure again.",
      "Open the coupon's detail and read whether it shows total usage, per-user usage, or both.",
      "Reload and confirm the figure persists.",
    ],
    inputs: { code: "ARENA25" },
    expectedBehaviour:
      "Redemption is counted at checkout, per user as well as globally, and the per-user record is written as a side effect of applying the coupon. That write is fire-and-forget, so a failure is silent — a usage figure that never moves is how you find out it failed.",
    expectedUiState:
      "The usage figure is exactly one higher after the order and survives a reload. A figure that does not move means the usage write failed without anything surfacing it.",
    expectedData: { usageIncrement: 1 },
    endResult:
      "One order exists carrying the discount. Delete QAADMIN15 as the last action on this page.",
  },
};
