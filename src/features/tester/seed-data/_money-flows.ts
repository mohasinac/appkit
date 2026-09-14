/*
 * WHY: End-to-end money flows — offers, auction wins, payments and the refusals
 *      that guard them. This was the largest hole in the catalogue: offers had
 *      cases for MAKING one but none for the seller accepting it and the buyer
 *      then paying, and a won auction had no payment path tested at all — which
 *      is exactly where Root Cause #60 lived (settlement wrote an order nobody
 *      could pay for, and no case would have caught it).
 *
 * WHAT: Exports moneyFlowsPages — the page definitions consumed by group() in
 *       tester-checklist-seed-data.ts.
 *
 * 🛑 THIS FILE IS THE REFERENCE for the six-part case contract. Every other page
 *    is authored against it, so it must never be the odd one out: role, startPage,
 *    steps, expectedBehaviour, expectedUiState, endResult — all six, every case,
 *    with literal values and named fixtures.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag access:server-only
 * @tag consumers:tester-checklist-seed-data.ts
 * @tag sideEffects:none
 */

import type { TesterCaseRole } from "../schemas";

interface MoneyFlowCase {
  key: string;
  label: string;
  /** Every role the case affects; per-role detail goes inline in the expectations. */
  roles: TesterCaseRole[];
  startPage?: string;
  steps: string[];
  inputs?: Record<string, string | number | boolean>;
  expectedBehaviour: string;
  expectedUiState: string;
  expectedData?: Record<string, string | number | boolean>;
  endResult: string;
  href?: string;
}

interface MoneyFlowPage {
  pageKey: string;
  pageLabel: string;
  href?: string;
  cases: MoneyFlowCase[];
}

/** Reused so the wording cannot drift between cases that mean the same thing. */
const STEP_SIGNIN_BUYER = "Sign in as the buyer ash@pokemonpalace.in.";
const STEP_PLACE_ORDER = "Click 'Place order'.";
const STEP_RELOAD_ORDERS = "Reload /user/orders.";

export const moneyFlowsPages: MoneyFlowPage[] = [
  {
    pageKey: "offer-to-purchase",
    pageLabel: "Offer → accept → pay",
    href: "/products/product-beyblade-burst-valkyrie",
    cases: [
      {
        key: "buyer-makes-offer",
        label: "A buyer can make an offer on a seller's product and it appears in their own offers list",
        roles: ["buyer"],
        startPage: "/products/product-beyblade-burst-valkyrie",
        steps: [
          STEP_SIGNIN_BUYER,
          "Open /products/product-beyblade-burst-valkyrie.",
          "Click 'Make Offer'.",
          "Enter 780 as the offer amount.",
          "Enter the note 'QA offer offer-to-purchase-buyer-makes-offer'.",
          "Click 'Submit offer'.",
          "Open /user/offers.",
        ],
        expectedBehaviour:
          "An offer is created for 780 against product-beyblade-burst-valkyrie, owned by the signed-in buyer, and the owning seller receives an offer-received notification.",
        expectedUiState:
          "The offer modal closes and a success confirmation appears. /user/offers lists a row for the product with amount ₹780 and status Pending. The page does NOT read 'No offers yet'.",
        endResult:
          "After reloading /user/offers the row is still listed at ₹780 with status Pending.",
      },
      {
        key: "duplicate-offer-refused",
        label: "A second offer on the same listing while one is still pending is refused",
        roles: ["buyer"],
        startPage: "/products/product-beyblade-burst-valkyrie",
        steps: [
          "Sign in as the buyer ash@pokemonpalace.in, holding the pending 780 offer from the previous case.",
          "Open /products/product-beyblade-burst-valkyrie.",
          "Click 'Make Offer'.",
          "Enter 800 as the offer amount.",
          "Click 'Submit offer'.",
        ],
        expectedBehaviour:
          "The second offer is rejected. No new offer document is created; the existing 780 offer is untouched.",
        expectedUiState:
          "An error states that an active offer already exists on this listing. The amount field keeps the entered 800 rather than clearing silently.",
        endResult:
          "After reloading /user/offers there is still exactly ONE pending row for this product, at ₹780 — not two, and not one at ₹800.",
      },
      {
        key: "seller-sees-and-accepts",
        label: "The owning seller sees the inbound offer and can accept it",
        roles: ["seller"],
        startPage: "/store/offers",
        steps: [
          "Sign in as tyson@beybladearena.in / TempPass123!, who owns store-beyblade-arena.",
          "Open /store/offers.",
          "Find the row for offer-yugi-burst-valkyrie-pending (product-beyblade-burst-valkyrie, offered ₹780 against a listed ₹999).",
          "Open the row actions menu.",
          "Click 'Accept'.",
          "Confirm in the dialog.",
          "Reload /store/offers.",
        ],
        expectedBehaviour:
          "The offer moves to Accepted, a locked price of 780 is recorded, and the buyer receives an offer-responded notification.",
        expectedUiState:
          "Before acting, the row menu offers Accept, Decline and Counter as enabled controls. After confirming, the row's status badge reads Accepted.",
        endResult:
          "After reloading /store/offers the status still reads Accepted — not Pending.",
        href: "/store/offers",
      },
      {
        key: "accepted-offer-locks-price",
        label: "🛑 Checkout bills the AGREED price, never the listing price",
        roles: ["buyer"],
        startPage: "/user/offers",
        steps: [
          "Sign in as vivaan.kapoor@gmail.com / TempPass123!, who holds offer-kaiba-dranzer-s-accepted on product-beyblade-original-dranzer-s (listed ₹1499, agreed ₹1250).",
          "Open /user/offers.",
          "Click through to checkout from the accepted offer.",
          "Read the line item price in the checkout summary.",
          "Continue to the payment step.",
          "Read the order total.",
        ],
        expectedBehaviour:
          "Every price computed for this line uses the locked 1250, not the product's current 1499.",
        expectedUiState:
          "The line item reads ₹1,250.00 and the order total reflects 1250 plus fees. ₹1,499 appears nowhere on the checkout screen for this line.",
        endResult:
          "Nothing is placed in this case — stop at the payment step. The check is that the two numbers never appear together for the same line.",
        href: "/user/offers",
      },
      {
        key: "owning-seller-cannot-offer",
        label: "The owning seller sees no Make Offer control on their own listing",
        roles: ["seller"],
        startPage: "/products/product-beyblade-burst-valkyrie",
        steps: [
          "Sign in as tyson@beybladearena.in / TempPass123!, who owns store-beyblade-arena.",
          "Open /products/product-beyblade-burst-valkyrie, a listing owned by that store.",
          "Read the action controls on the listing.",
        ],
        expectedBehaviour:
          "The seller is not offered any purchase path on their own listing — you cannot make an offer on, or buy, your own item.",
        expectedUiState:
          "'Make Offer' is ABSENT, not merely disabled. A seller-facing control such as 'Edit listing' is shown instead.",
        endResult:
          "Nothing is persisted; this is a read-only check of which controls render for the owner.",
        href: "/products/product-beyblade-burst-valkyrie",
      },
      {
        key: "offer-lane-blocks-other-items",
        label: "An accepted offer in the cart blocks unrelated items from being checked out alongside it",
        roles: ["buyer"],
        startPage: "/cart",
        steps: [
          "Sign in as vivaan.kapoor@gmail.com / TempPass123!, who holds offer-kaiba-dranzer-s-accepted.",
          "Open /user/offers and start checkout from that accepted offer so its locked line enters the cart, then return to /products.",
          "Open /products/product-beyblade-burst-valkyrie and click 'Add to cart'.",
          "Open /cart.",
          "Read which lane or tab each line sits in.",
          "Attempt to check out the standard item.",
        ],
        expectedBehaviour:
          "The cart separates the offer line from the standard line, and only the higher-priority offer lane may be checked out while it is pending.",
        expectedUiState:
          "The two lines appear under different lane labels, and the standard lane's checkout control is disabled with a stated reason — not silently inert.",
        endResult:
          "After reloading /cart both lines are still present and still in separate lanes.",
        href: "/cart",
      },
      {
        key: "expired-offer-cannot-checkout",
        label: "An offer past its window can no longer be paid",
        roles: ["buyer"],
        startPage: "/user/offers",
        steps: [
          "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
          "Open /user/offers and find offer-kaiba-x-wizard-arrow-expired (product-beyblade-x-wizard-arrow, ₹700), whose window closed two days ago.",
          "Read the row's status badge and the date it names.",
          "Read every control the row offers.",
          "Attempt to start checkout from that offer.",
        ],
        expectedBehaviour:
          "Checkout is refused once the window has passed; the offer is treated as expired rather than payable.",
        expectedUiState:
          "The row reads Expired and offers no checkout control. It must not silently proceed at ₹700.",
        endResult:
          "After reloading /user/offers the row still reads Expired.",
        href: "/user/offers",
      },
    ],
  },
  {
    pageKey: "auction-win-to-payment",
    pageLabel: "Win an auction → get notified → pay",
    href: "/auctions/auction-money-flows-closing",
    cases: [
      {
        key: "winning-bid-recorded",
        label: "Placing the highest bid on a closing auction records you as the winner",
        roles: ["buyer"],
        // Batch-scoped fixture, seeded by
        // seed-data/fixtures/money-flows__auction-win-to-payment.mjs and closing
        // ~3 minutes after this batch starts.
        //
        // It used to cite auction-beyblade-original-dragoon-storm, which 46 OTHER
        // citations need LIVE — one fixture with two contradictory
        // requirements, so this case could never pass its final step and the
        // rig notes recorded it as unpassable-by-design.
        startPage: "/auctions/auction-money-flows-closing",
        steps: [
          STEP_SIGNIN_BUYER,
          "Open /auctions/auction-money-flows-closing, which starts at ₹15,000 with a ₹1,000 increment and closes about three minutes from now.",
          "Note the current bid and the end time.",
          "Enter 16000 as the bid amount.",
          "Click 'Place Bid'.",
          "Wait past the auction end time, reloading the page.",
        ],
        expectedBehaviour:
          "The bid is accepted at 16000, becomes the winning bid, and after the end time the auction settles with this buyer as winner.",
        expectedUiState:
          "Immediately after bidding the page shows '1 bid' and ₹16,000.00 without a manual refresh. After the end time it shows the auction as ended and names you as the winning bidder.",
        endResult:
          "After reloading, the auction still reads ended with your winning bid at ₹16,000.00, and Bid History lists it with other bidders' names masked.",
      },
      {
        key: "win-notification-arrives",
        label: "🛑 Winning an auction produces a notification that links somewhere payable",
        roles: ["buyer"],
        startPage: "/user/notifications",
        steps: [
          "Sign in as the buyer who won auction-money-flows-closing.",
          "Open the notifications bell in the header.",
          "Find the auction-won notification.",
          "Read its text.",
          "Click it.",
        ],
        expectedBehaviour:
          "A notification exists for the win, names the item, and its action URL resolves to a page from which the win can be paid.",
        expectedUiState:
          "The notification names the auction. Following it lands on a page showing the amount due and a payment control — not a generic listing page and not a 404.",
        endResult:
          "The notification remains in the list after reload, marked read.",
        href: "/user/notifications",
      },
      {
        key: "won-auction-is-payable",
        label: "🛑 A won auction can actually be paid for",
        roles: ["buyer"],
        startPage: "/user/orders",
        steps: [
          "Sign in as the buyer who won auction-money-flows-closing.",
          "Open /user/orders.",
          "Locate the won auction.",
          "Click its payment call to action.",
          "Read the amount due.",
          "Proceed as far as the payment method selection.",
        ],
        expectedBehaviour:
          "A reachable payment path exists and the amount due equals the winning bid of ₹16,000.",
        expectedUiState:
          "The order shows ₹16,000.00 due and a payment control. Root Cause #60 is exactly this failing — settlement once wrote an order with no payment route, so 'the record exists' is NOT a pass; a payment step must be reachable.",
        endResult:
          "Stop at the payment method step. After reloading /user/orders the order is still listed as awaiting payment.",
        href: "/user/orders",
      },
      {
        key: "won-auction-line-is-locked",
        label: "A won-auction line cannot be removed from the cart or have its quantity changed",
        roles: ["buyer"],
        startPage: "/cart",
        steps: [
          "Sign in as the buyer holding the won auction line.",
          "Open /cart.",
          "Attempt to change the quantity on the won-auction line.",
          "Attempt to remove that line.",
          "Click 'Remove all'.",
        ],
        expectedBehaviour:
          "Quantity is fixed at 1 and removal is refused for the won line. 'Remove all' clears other lines but keeps this one.",
        expectedUiState:
          "The quantity stepper is absent or disabled on that line, and the remove control is refused with a stated reason. After 'Remove all', a message explicitly says the awaiting-payment line was kept.",
        endResult:
          "After reloading /cart the won-auction line is still present.",
        href: "/cart",
      },
      {
        key: "unpaid-win-forfeits",
        label: "An unpaid win past its deadline is forfeited and the buyer is told",
        roles: ["buyer"],
        startPage: "/user/orders",
        steps: [
          "Sign in as the buyer holding an unpaid won auction.",
          "Leave it unpaid until its payment deadline passes.",
          STEP_RELOAD_ORDERS,
          "Open the notifications bell.",
        ],
        expectedBehaviour:
          "The win is forfeited or cancelled rather than remaining payable, and the buyer is notified.",
        expectedUiState:
          "The order reads Forfeited or Cancelled and offers no payment control. A notification explains the forfeit.",
        endResult:
          "After reloading, the order still reads forfeited and the line is gone from /cart — it must not sit there payable forever.",
        href: "/user/orders",
      },
    ],
  },
  {
    pageKey: "payment-methods",
    pageLabel: "Making payments",
    href: "/checkout",
    cases: [
      {
        key: "cod-order-places",
        label: "A cash-on-delivery order can be placed and shows the COD fee before confirming",
        roles: ["buyer"],
        startPage: "/products/product-beyblade-burst-valkyrie",
        steps: [
          STEP_SIGNIN_BUYER,
          "Open /products/product-beyblade-burst-valkyrie and click 'Add to cart'.",
          "Open /checkout and complete the address step.",
          "Continue to the add-ons and fees step.",
          "Select 'Cash on Delivery'.",
          "Read every fee line in the order summary and note the total.",
          STEP_PLACE_ORDER,
          STEP_RELOAD_ORDERS,
        ],
        expectedBehaviour:
          "A COD order is created, and the COD handling fee and deposit are included in the recorded total.",
        expectedUiState:
          "Before confirming, the summary lists the COD handling fee and any deposit as their own lines, and the total includes them.",
        endResult:
          "After reloading /user/orders the order exists with a total exactly equal to the figure shown at checkout.",
      },
      {
        key: "manual-payment-proof-upload",
        label: "🛑 A manual (UPI) order reaches a page where proof can actually be uploaded",
        roles: ["buyer"],
        startPage: "/checkout",
        steps: [
          "Sign in as the buyer ash@pokemonpalace.in with product-beyblade-original-dranzer-s in the cart.",
          "Open /checkout and complete the address step.",
          "Select UPI / manual payment.",
          STEP_PLACE_ORDER,
          "Follow the redirect that appears after placing it.",
          "Read the UPI id and the countdown shown.",
          "Upload public/test-media/sample-image.png as payment proof.",
          "Reload the page.",
        ],
        expectedBehaviour:
          "The order is created awaiting manual payment, and the uploaded proof is attached to it for admin review.",
        expectedUiState:
          "The page shows a UPI id, a visible deadline countdown, and a working upload control. It must NOT read 'This order does not require manual payment upload' — that message on a manual order is the Root Cause #57 failure.",
        endResult:
          "After reloading, the uploaded proof is still shown attached to the order.",
        href: "/user/orders",
      },
      {
        key: "payment-page-reachable-later",
        label: "The payment page for an unpaid order is reachable again after navigating away",
        roles: ["buyer"],
        startPage: "/user/orders",
        steps: [
          "Sign in as the buyer holding an unpaid manual-payment order.",
          "Open the homepage without paying.",
          "Open /user/orders.",
          "Open the unpaid order.",
        ],
        expectedBehaviour:
          "The order detail exposes a route back to the payment and proof-upload page.",
        expectedUiState:
          "A 'Complete payment' or 'Re-upload proof' control is visible on the order detail.",
        endResult:
          "Following that control lands on the payment page for the same order, and it still shows the amount due after a reload.",
        href: "/user/orders",
      },
      {
        key: "fees-match-between-preview-and-order",
        label: "🛑 The total shown at checkout equals the total recorded on the order",
        roles: ["buyer"],
        startPage: "/checkout",
        steps: [
          STEP_SIGNIN_BUYER,
          "Add product-beyblade-burst-valkyrie (store-beyblade-arena) to the cart.",
          "Add prizedraw-beyblade-mystery-box (store-letitrip-official) to the cart, so the cart spans two sellers.",
          "Open /checkout and reach the payment step.",
          "Write down the exact total and every fee line.",
          STEP_PLACE_ORDER,
          "Open /user/orders and add up the totals of the orders just produced.",
        ],
        expectedBehaviour:
          "A two-seller cart splits into one order per seller, and the platform commission is charged ONCE for the checkout rather than once per seller.",
        expectedUiState:
          "The checkout summary shows a single platform-fee line, qualified by the number of stores where relevant.",
        endResult:
          "After reload, the sum of the recorded order totals equals the checkout figure to the rupee.",
      },
      {
        key: "coupon-applies-and-persists",
        label: "A coupon applied at checkout is reflected in the placed order",
        roles: ["buyer"],
        startPage: "/checkout",
        steps: [
          STEP_SIGNIN_BUYER,
          "Add product-beyblade-burst-valkyrie to the cart.",
          "Open /checkout and reach the payment step.",
          "Enter the coupon code ARENA25 and apply it.",
          "Note the discount line and the new total.",
          STEP_PLACE_ORDER,
          STEP_RELOAD_ORDERS,
        ],
        expectedBehaviour:
          "The discount is applied to the order that is created, and the coupon's usage count increments.",
        expectedUiState:
          "A discount line appears naming ARENA25, and the total drops accordingly before the order is placed.",
        endResult:
          "After reloading the order, ARENA25 and the same discount amount are still recorded on it.",
      },
    ],
  },
  {
    pageKey: "blockers",
    pageLabel: "Blockers and refusals",
    href: "/cart",
    cases: [
      {
        key: "out-of-stock-blocked",
        label: "A sold-out item cannot be added to the cart or checked out",
        roles: ["buyer"],
        startPage: "/products/product-beyblade-burst-valtryek-v3-sold-out",
        steps: [
          STEP_SIGNIN_BUYER,
          "Open /products/product-beyblade-burst-valtryek-v3-sold-out, a deliberately sold-out fixture.",
          "Attempt to add it to the cart.",
        ],
        expectedBehaviour:
          "The add is refused and no cart line is created for an unavailable item.",
        expectedUiState:
          "The add control is disabled or replaced by a Sold Out state, with the reason stated on the page.",
        endResult:
          "After reloading /cart the item is absent.",
        href: "/products/product-beyblade-burst-valtryek-v3-sold-out",
      },
      {
        /*
         * 🛑 THIS CASE MOVED FROM THE CART TO THE BUNDLE EDITOR, 2026-09-15.
         *
         * It used to open a deliberately-banned pair of fixtures — two products
         * in different stores wired into one group — and assert that the cart's
         * picker refused them. Those fixtures are gone, and no replacement can
         * be seeded: the guard the case tests is applied at SAVE time, so a
         * cross-store group cannot exist to be opened.
         *
         * The refusal is therefore tested where it actually fires — an admin
         * ATTEMPTS the banned shape and is refused before it is stored.
         */
        key: "cross-store-group-refused",
        label: "A bundle whose members span two stores is refused when saved",
        roles: ["admin"],
        startPage: "/admin/bundles",
        steps: [
          "Sign in as admin@letitrip.in / TempPass123!.",
          "Open /admin/bundles and start a new bundle.",
          "Name it 'QA cross-store bundle'.",
          "Add product-beyblade-burst-valkyrie (store-beyblade-arena) as a member.",
          "Add prizedraw-beyblade-mystery-box (store-letitrip-official) as a second member — a different store.",
          "Set the bundle price to 1000 and click Save.",
        ],
        inputs: { bundleName: "QA cross-store bundle", bundlePrice: 1000 },
        expectedBehaviour:
          "The save is refused because an order belongs to exactly one seller, and a bundle spanning two stores would produce an order containing another seller's product — with no notification, no shipping resolution and no payout for that second seller. The refusal is at save time, not at add-to-cart time, so bundles already stored keep working.",
        expectedUiState:
          "An error names the two stores, or at least states that a bundle cannot span sellers. The editor stays open with the entered members intact rather than clearing.",
        endResult:
          "After reloading /admin/bundles there is no bundle named 'QA cross-store bundle'.",
        href: "/admin/bundles",
      },
      {
        key: "classified-has-no-cart",
        label: "A classified listing offers contact, never Add to Cart",
        roles: ["buyer"],
        startPage: "/classified/classified-beyblade-stadium-set",
        steps: [
          STEP_SIGNIN_BUYER,
          "Open /classified/classified-beyblade-stadium-set.",
          "Read every action control on the listing.",
        ],
        expectedBehaviour:
          "A classified is a contact-only listing type with no cart path at all.",
        expectedUiState:
          "Exactly one of 'Make Offer', 'Request to Buy' or a contact-seller control is present. 'Add to Cart' and 'Buy Now' are ABSENT, not disabled.",
        endResult:
          "Nothing is persisted; this is a read-only check of which controls render.",
        href: "/classified/classified-beyblade-stadium-set",
      },
      {
        key: "guest-gated-action-prompts-signin",
        label: "A gated action while signed out prompts sign-in and then completes the original action",
        roles: ["guest"],
        startPage: "/products/product-beyblade-burst-valkyrie",
        steps: [
          "Sign out completely.",
          "Open /products/product-beyblade-burst-valkyrie.",
          "Click the wishlist heart.",
          "Sign in as ash@pokemonpalace.in through the prompt that appears.",
        ],
        expectedBehaviour:
          "The click is held while signing in and then replayed, so the item ends up on the wishlist.",
        expectedUiState:
          "A sign-in prompt appears rather than the click doing nothing. After signing in, the heart shows the saved state.",
        endResult:
          "After reloading /wishlist the item is listed.",
        href: "/products/product-beyblade-burst-valkyrie",
      },
      {
        key: "banned-account-blocked",
        label: "A disabled account cannot sign in and is told why",
        roles: ["guest"],
        startPage: "/auth/login",
        steps: [
          "Sign out completely.",
          "Open /auth/login.",
          "Enter the credentials of an account an admin has disabled.",
          "Click 'Sign in'.",
        ],
        expectedBehaviour:
          "Authentication is refused for a disabled account; no session cookie is issued.",
        expectedUiState:
          "A clear message states the account is disabled. The form must not appear to succeed and then fail on the next page.",
        endResult:
          "After reloading, the user is still signed out and /user/profile redirects to login.",
        href: "/auth/login",
      },
    ],
  },
];
