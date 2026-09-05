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
      "Open /how-it-works/auctions in a private window and read its content.",
      "Open /how-it-works/checkout and read its content.",
      "Open /how-it-works/offers and read its content.",
      "Open /how-it-works/orders and read its content.",
      "Open /how-it-works/payouts and read its content.",
      "Open /how-it-works/pre-orders and read its content.",
      "Open /how-it-works/reviews and read its content.",
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
};
