/*
 * WHY: Authored six-part procedures for the public-pages/help-how-it-works page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * "Loads correctly" is one honest step and one honest observation — but a page
 * that returns 200 while rendering an empty shell is the failure mode this
 * codebase actually has, so each case names something that must be ON the page
 * rather than asking whether it loaded.
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
  "checklist-public-pages-help-how-it-works-contact-page": {
    roles: ["guest"],
    startPage: "/contact",
    steps: [
      "Open /contact in a private window with no session.",
      "Read the page for a form, contact details and any social or WhatsApp links.",
      "Click Send with every field empty.",
      "Read where the errors appear.",
      "Type 'QA Contact contact-page' as the name, 'qa-contact@mailnull.com' as the email, 'Checklist submission' as the subject and 'Submitted by the tester checklist.' as the message.",
      "Click Send.",
    ],
    inputs: {
      name: "QA Contact contact-page",
      email: "qa-contact@mailnull.com",
      subject: "Checklist submission",
      message: "Submitted by the tester checklist.",
    },
    expectedBehaviour:
      "The form validates in the browser against its schema and reports each problem on the field that caused it, then submits and is delivered. A contact form that 200s and delivers nothing is indistinguishable from a working one on screen, which is why the empty submit is checked first.",
    expectedUiState:
      "The empty submit puts inline errors under the specific fields — not one banner and not a browser-native tooltip. The filled submit produces a visible confirmation, and the form clears or becomes read-only rather than sitting there inviting a second send.",
    endResult:
      "A confirmation is shown. If a mailbox for the site's contact address is reachable, the message should arrive there; if it is not reachable, note that in the comment rather than assuming delivery.",
  },
  "checklist-public-pages-help-how-it-works-help-page": {
    roles: ["guest"],
    startPage: "/help",
    steps: [
      "Open /help in a private window with no session.",
      "Read the page headings and the body content.",
      "Click each link on the page in turn and read where it lands, going back each time.",
    ],
    expectedBehaviour:
      "The help page renders real content and every link on it resolves. It is one of the destinations the footer and sidebar support links point at, so a broken link here is reached from every page on the site.",
    expectedUiState:
      "Headings and body text are present — not a bare chrome-and-spinner shell and not an empty container. Every link lands on a real page rather than a 404 or a silent redirect back to /.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-help-how-it-works-how-it-works-pages": {
    roles: ["guest"],
    startPage: "/help",
    steps: [
      /*
       * 🛑 CORRECTED 2026-09-14. These seven steps named /how-it-works/<topic>,
       * a route family that does not exist — every one was a 404, so the case
       * could only ever be answered "no" for a reason that was not a product
       * defect. The real routes are flat: /how-<topic>-work(s). That is also why
       * these seven pages read as zero-coverage in a gap sweep despite having a
       * case: the case pointed at nothing.
       *
       * audit-tester-checklist-hrefs did not catch it because it validates the
       * `href` and `startPage` FIELDS, and these paths live inside step strings.
       */
      "Open /how-auctions-work in a private window and read its content.",
      "Open /how-checkout-works and read its content.",
      "Open /how-offers-work and read its content.",
      "Open /how-orders-work and read its content.",
      "Open /how-payouts-work and read its content.",
      "Open /how-pre-orders-work and read its content.",
      "Open /how-reviews-work and read its content.",
      "Write down any of the seven that renders empty, 404s, or repeats another page's copy.",
    ],
    expectedBehaviour:
      "All seven guides render their own distinct copy. Sharing one renderer is correct; sharing one body of text is not — two guides with identical content means the page key is not reaching the content lookup.",
    expectedUiState:
      "Each of the seven shows a heading and body specific to its topic. None is blank, none 404s, and no two are word-for-word the same.",
    expectedData: { guidePageCount: 7 },
    endResult:
      "Read-only; nothing persists. Name every failing page in the comment, not just the first.",
  },
  "checklist-public-pages-help-how-it-works-fees-page": {
    roles: ["guest"],
    startPage: "/fees",
    steps: [
      "Open /fees in a private window with no session.",
      "Read every fee and percentage stated on the page.",
      "Look specifically for a payout hold period, a minimum payout amount, a gateway fee percentage and any seller commission split.",
    ],
    expectedBehaviour:
      "The page explains what a BUYER pays. Seller-side and platform-internal figures — payout hold days, minimum payout, gateway fee, the seller share of an EMI surcharge — are not buyer-facing and have no reason to be on a public page. Those fields were being published by an unauthenticated settings endpoint for a long time, so this page is worth reading with that specifically in mind.",
    expectedUiState:
      "Buyer-facing fees are stated: platform fee and its cap, COD handling, the add-on fees, GST. No payout hold period, minimum payout amount, gateway fee percentage or seller surcharge share appears anywhere on the page or in its source.",
    expectedData: { sellerInternalFiguresShown: 0 },
    endResult:
      "Read-only; nothing persists. Any seller-side figure found here is a projection leak, not a copy problem.",
  },
  "checklist-public-pages-help-how-it-works-how-emi-works-page": {
    roles: ["guest"],
    startPage: "/how-emi-works",
    steps: [
      "Open /how-emi-works signed out and read the whole page.",
      "Write down the eligibility threshold it states and the worked example it gives.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and put live-golden-retriever-puppy in the cart.",
      "Reach the payment step and read the instalment figures offered.",
      "Compare them against the page's worked example.",
      "Empty the cart, add product-beyblade-burst-valkyrie instead, and check EMI is NOT offered below the threshold.",
    ],
    inputs: { eligibleProduct: "live-golden-retriever-puppy", ineligibleProduct: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "The page's threshold and worked example match what checkout does. This is the eighth how-it-works page and the only one describing money, so a stale figure here is a misstated charge rather than stale prose — and the aggregate case covering the family enumerates seven, which is why it needed its own.",
    expectedUiState:
      "The stated threshold matches the price at which checkout starts offering EMI, and the worked example's instalment figures match the real ones. Either mismatch is a finding, with both numbers.",
    endResult: "Empty the cart; place no order.",
  },

  /* ── Added 2026-09-14 (F3d) ──────────────────────────────────────────────────
   * The blanket "how-it-works-pages" case above asserts all seven LOAD. These
   * assert each one is TRUE: read the guide, then open the feature and compare.
   * A guide is documentation with no compiler behind it, so nothing catches
   * drift except doing both halves in one sitting — "it loads" passes against
   * every stale sentence on the page.
   */
  "checklist-public-pages-help-how-it-works-how-auctions-work-matches-product": {
    roles: ["guest"],
    startPage: "/how-auctions-work",
    steps: [
      "Open /how-auctions-work signed out and read it end to end.",
      "Write down what it says about the minimum bid increment, about bidding in the final minutes, and about what happens when a reserve is not met.",
      "Open /auctions/auction-beyblade-original-dragoon-storm in a second tab.",
      "Compare each of those three claims against what the auction page shows and what its bid form states.",
    ],
    expectedBehaviour:
      "Every claim the guide makes is true of the live auction: the increment it names is the increment the bid form enforces, the end-of-auction behaviour it describes is what the page shows, and an anti-snipe extension it promises actually exists.",
    expectedUiState:
      "The guide renders its own headings and body text, not a placeholder. Each of the three claims matches. Quote verbatim any sentence that does not, next to what the auction page actually showed.",
    endResult:
      "Read-only; nothing persists. Prices are gated signed out, so compare the RULES rather than the amounts. A mismatch is a real defect even though both pages load.",
  },
  "checklist-public-pages-help-how-it-works-how-checkout-works-matches-product": {
    roles: ["buyer"],
    startPage: "/how-checkout-works",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /how-checkout-works and write down the checkout steps it names, in order.",
      "Add product-beyblade-burst-valkyrie to the cart and open /checkout.",
      "Write down the steps checkout actually presents, in order.",
      "Compare the two lists.",
    ],
    expectedBehaviour:
      "The guide names the same steps in the same order as the product: Address, then Add-ons and fees, then Payment. A guide still describing a two-step checkout sends a buyer looking for a screen that is not there; one that omits the add-ons step hides where the fees are chosen.",
    expectedUiState:
      "The checkout step indicator shows three steps and the guide's list matches it. Any extra, missing or reordered step is quoted exactly from the guide.",
    expectedData: { checkoutSteps: 3 },
    endResult: "A cart line is left behind — remove it afterwards. Place no order. The guide itself is read-only.",
  },
  "checklist-public-pages-help-how-it-works-how-offers-work-matches-product": {
    roles: ["buyer"],
    startPage: "/how-offers-work",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /how-offers-work and write down what it says about how many counter-rounds are allowed and when an offer expires.",
      "Open /products/product-beyblade-burst-valkyrie and open the Make-an-Offer form.",
      "Read the limits and expiry the form itself states.",
      "Compare them against the guide, then close the form without submitting.",
    ],
    expectedBehaviour:
      "The guide does not promise more counter-rounds than the product allows, and names the same expiry the offer actually gets. Over-promising here costs a buyer a negotiation they believed was still open.",
    expectedUiState:
      "The offer form states its own limits. Every number in the guide matches a number the product enforces; any that does not is quoted from both places.",
    endResult: "Do not submit the offer — cancel out of the form. Nothing persists.",
  },
  "checklist-public-pages-help-how-it-works-how-orders-work-matches-product": {
    roles: ["buyer"],
    startPage: "/how-orders-work",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /how-orders-work and list every order status it names.",
      "Open /user/orders and list every status offered by the Active, Closed and All tabs and by the status filter.",
      "Compare the two lists in both directions.",
    ],
    expectedBehaviour:
      "Every status the guide names is one an order can actually hold, and the guide omits none a buyer will see. A status that exists only in the guide teaches a vocabulary the product never uses.",
    expectedUiState:
      "Both lists are written down and compared. Any status present in one and absent from the other is named explicitly, with which side it came from.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-help-how-it-works-how-payouts-work-matches-product": {
    roles: ["seller"],
    startPage: "/how-payouts-work",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /how-payouts-work and write down the payout schedule and every deduction it names.",
      "Open /store/payouts and read the schedule and deductions shown there.",
      "Open one payout's detail and compare its deduction lines against the guide's list.",
    ],
    expectedBehaviour:
      "The schedule and the deductions match. This page describes money a seller is owed, so a stale figure is a seller expecting the wrong amount on the wrong day — not merely stale prose.",
    expectedUiState:
      "Each deduction named in the guide appears on a real payout, and each deduction on the payout is explained by the guide. Mismatches are quoted with both numbers.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-help-how-it-works-how-pre-orders-work-matches-product": {
    roles: ["guest"],
    startPage: "/how-pre-orders-work",
    steps: [
      "Open /how-pre-orders-work signed out and write down what it says about the deposit and about whether a pre-order can be cancelled.",
      "Open /pre-orders/preorder-beyblade-x-bx-08-wave.",
      "Read what that listing states about its deposit terms and cancellability.",
      "Compare the two.",
    ],
    expectedBehaviour:
      "The deposit wording and the cancellation rule match the listing. These are the two claims that drift, and both commit the buyer's money.",
    expectedUiState:
      "The listing states deposit terms and a cancellation stance; the guide describes the same ones. Any difference is quoted from both pages.",
    endResult:
      "Read-only; nothing persists. Prices are gated signed out, so compare the TERMS rather than the amounts.",
  },
  "checklist-public-pages-help-how-it-works-how-reviews-work-matches-product": {
    roles: ["buyer"],
    startPage: "/how-reviews-work",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /how-reviews-work and write down who it says may leave a review and when.",
      "Open /products/product-beyblade-burst-valkyrie and try to leave a review.",
      "Read what the form allows or refuses, and the reason it gives.",
    ],
    expectedBehaviour:
      "What the form enforces is what the guide describes. If the guide says only verified purchasers may review, the form refuses a non-purchaser and says so; if the form allows it anyway, the guide is wrong.",
    expectedUiState:
      "Either the review form opens, or a refusal states its reason. That outcome matches the guide's sentence, which is quoted in the answer.",
    endResult: "Do not submit a review. Nothing persists.",
  },
  "checklist-public-pages-help-how-it-works-track-order-page-works": {
    roles: ["guest"],
    startPage: "/track",
    steps: [
      "Open the site footer signed out and find the Support group.",
      "Click the track-order link and note where it lands.",
      "Type 9ab3f1-not-a-real-order into the tracking field and submit.",
      "Note exactly what is shown.",
      "Now submit the field left empty and note exactly what is shown.",
    ],
    inputs: { nonsenseOrderId: "9ab3f1-not-a-real-order" },
    expectedBehaviour:
      "The footer link resolves to a real page, and a nonsense id produces a clear not-found outcome rather than a blank panel or a spinner that never resolves. The nonsense id is the control: a page answering the same way to everything is not looking anything up, and a tracking page that never fails is indistinguishable from one that never works.",
    expectedUiState:
      "The page renders a tracking form. The nonsense id yields an explicit not-found message; the empty submit yields a field-level validation error rather than a silent no-op. Screenshot both outcomes.",
    endResult:
      "Read-only; nothing persists. The id above is INVENTED and is expected not to resolve — that is the point of the control.",
  },
};
