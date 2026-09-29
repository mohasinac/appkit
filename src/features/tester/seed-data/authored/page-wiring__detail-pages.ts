/*
 * WHY: Authored six-part procedures for the page-wiring/detail-pages page.
 * WHAT: 3 case(s), keyed by full checklist id.
 *
 * 🛑 REHAN NEVER BID (corrected 2026-09-29). The identity case said to find a
 * bid placed by rehan.sheikh@gmail.com. Only three personas bid anywhere in the
 * seed: user-rohit-collector, user-ananya-collector and user-meera-bey. So the
 * step found nothing, and its buyer half would then have been signing in as
 * someone looking at another person's bid, which is a different test entirely.
 *
 * Bid ids are DERIVED and therefore knowable:
 *   bid-{auctionSuffix}-{userSuffix}-20260601-{NNN}
 * so the first bid on auction-beyblade-original-dragoon-storm is
 *   bid-beyblade-original-dragoon-storm-rohit-collector-20260601-000
 * That auction has three distinct bidders, which is what makes it the right
 * fixture for a case about seeing other people's identities.
 *
 * ONE builder, FOUR viewers. `buildBidDetailFields(bid, viewer)` is called by
 * AdminBidsView's modal ('admin'), UserBidsView ('buyer'), SellerBidsView
 * ('seller') and the shared BidDetailPageClient behind all three /view pages.
 * Its only viewer-dependent row is Bidder, added when viewer !== 'buyer'. The
 * seller leg had no case at all and now has one.
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
      "Click the modal's 'Open full page' link and note the URL it lands on.",
      "Confirm that URL is /admin/bids/{that bid id}/view.",
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
      "Open /admin/bids/bid-beyblade-original-dragoon-storm-rohit-collector-20260601-000/view directly. It is the first of three bids on auction-beyblade-original-dragoon-storm, placed by rohit.collect@gmail.com.",
      "Write down every bidder name and identifier shown anywhere on the page.",
      "Sign out and sign in as rohit.collect@gmail.com / TempPass123!, the buyer who placed it.",
      "Open /user/bids/bid-beyblade-original-dragoon-storm-rohit-collector-20260601-000/view.",
      "Write down every bidder name and identifier shown anywhere on that page, including in the page source.",
    ],
    expectedBehaviour:
      "One viewer argument decides what each portal reveals, in one place. The admin view may name other bidders because moderating a dispute requires it; the buyer's own view must not, because a competitor's identity is not the buyer's to see.",
    expectedUiState:
      "The admin page shows a Bidder row naming who placed it; the buyer page omits that row entirely — it is the one field buildBidDetailFields makes viewer-dependent, added only when the viewer is not the buyer. Check the page source too, not merely what is rendered. A competing bidder's real name anywhere in the buyer view is a leak.",
    expectedData: { otherBidderNamesInBuyerView: 0 },
    endResult:
      "Read-only; nothing persists. A buyer view that shows nothing at all also fails — the buyer must still see their own bid.",
  },
  "checklist-page-wiring-detail-pages-detail-page-seller-sees-bidder": {
    roles: ["seller"],
    startPage: "/store/bids",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/bids and open the first bid row so its modal appears.",
      "Write down every field label the modal shows, in order.",
      "Open /store/bids/bid-beyblade-original-dragoon-storm-rohit-collector-20260601-000/view directly.",
      "Write down every field label that page shows, in order, and compare the two lists.",
      "Read whether a Bidder row is present and what it names.",
    ],
    inputs: { bidId: "bid-beyblade-original-dragoon-storm-rohit-collector-20260601-000", viewer: "seller" },
    expectedBehaviour:
      "The seller is the third viewer of the same field builder, and the only one with no case until now. A seller running an auction needs to know who bid, so the Bidder row is present for them as it is for an admin; the buyer is the single viewer it is withheld from.",
    expectedUiState:
      "The modal and the page show the same labels in the same order. A Bidder row is present and names the bidder. If it is absent, the seller cannot tell who is bidding on their own auction — and if the buyer view gained one, that is the leak the case above tests.",
    expectedData: { bidderRowShown: true },
    endResult:
      "Read-only; nothing persists. Every bid on this auction belongs to store-beyblade-arena, which is tyson's store, so the seller is entitled to see it.",
  },
};
