/*
 * WHY: Authored six-part procedures for the page-wiring/detail-pages page.
 * WHAT: 2 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
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
  "checklist-page-wiring-detail-pages-detail-page-matches-list-modal": {
    roles: ["admin"],
    startPage: "/admin/bids",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bids and open the first bid row so its modal appears.",
      "Write down every field label the modal shows, in order.",
      "Copy the bid's id and close the modal.",
      "Open /admin/bids/{id}/view directly, substituting the copied id.",
      "Write down every field label that page shows, in order.",
      "Compare the two lists.",
    ],
    expectedBehaviour:
      "The modal and the page are two renderings of ONE field builder, so their field sets are identical by construction. Any difference means a second copy of the builder has appeared, and two copies of a field list drift the first time one is edited.",
    expectedUiState:
      "Both surfaces show the same labels, in the same order, with the same values. A field present in one and missing from the other is the failure — including a field the page adds that the modal does not have.",
    endResult:
      "Read-only; nothing persists. Comparing labels rather than layout is deliberate: the two are allowed to look different, they are not allowed to say different things.",
  },
  "checklist-page-wiring-detail-pages-detail-page-hides-identity-per-portal": {
    roles: ["admin", "buyer"],
    startPage: "/admin/bids",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bids and find a bid placed by rehan.sheikh@gmail.com on an auction that other people have also bid on.",
      "Copy that bid's id and open /admin/bids/{id}/view.",
      "Write down every bidder name and identifier shown anywhere on the page.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/bids/{id}/view with the same id.",
      "Write down every bidder name and identifier shown anywhere on that page, including in the page source.",
    ],
    expectedBehaviour:
      "One viewer argument decides what each portal reveals, in one place. The admin view may name other bidders because moderating a dispute requires it; the buyer's own view must not, because a competitor's identity is not the buyer's to see.",
    expectedUiState:
      "The admin page may show other bidders' identities. The buyer page shows only their own bid, with any other bidder masked or absent — and that holds in the page source too, not merely in what is rendered. A real name anywhere in the buyer view is a leak.",
    expectedData: { otherBidderNamesInBuyerView: 0 },
    endResult:
      "Read-only; nothing persists. A buyer view that shows nothing at all also fails — the buyer must still see their own bid.",
  },
};
