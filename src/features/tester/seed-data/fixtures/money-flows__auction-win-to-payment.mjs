/*
 * Per-batch fixtures for money-flows/auction-win-to-payment.
 *
 * THE PROBLEM THIS SOLVES
 *
 * `winning-bid-recorded` ends with "Wait past the auction end time, reloading
 * the page" — it must watch an auction CLOSE. It cited
 * `auction-tester-sandbox-cycle-1`, which 46 other citations need LIVE. One
 * fixture, two contradictory requirements: extending it served 21 of the 22
 * cases and made this one permanently unpassable, which the rig notes recorded
 * as a fixture-design problem rather than a product defect.
 *
 * A batch-scoped auction removes the contradiction: this one closes three
 * minutes after the batch starts and belongs to nobody else.
 *
 * 🛑 THE ID IS FIXED, NOT `auction-{{w}}-closing`, AND THAT IS DELIBERATE.
 *
 * `{{w}}` is substituted when FIXTURES are seeded — `substituteWorker` runs
 * inside `seedFixtures`. It is NOT substituted in CASE text: `WORKER_SLOT` is
 * used only for seeding and identity selection, so a case saying
 * `auction-{{w}}-closing` would reach the tester with the literal braces.
 *
 * That gap is not hypothetical. `buying__bidding.mjs` seeds four `{{w}}`
 * auctions plus a 13-bid ladder, and NO case names any of them — not by id,
 * not by title ("Live Auction Probe", "Bid History Probe" appear nowhere in the
 * catalogue). Those fixtures are created and torn down every run and nothing
 * ever looks at them. A fixture the cases cannot name is not a fixture.
 *
 * A fixed id is safe HERE specifically: this page is four cases, far below the
 * 12-case chunk threshold, so it is never split across concurrent workers —
 * and worker collision is the only thing `{{w}}` protects against. If this page
 * ever grows past the cap, either give the runner real case-text substitution
 * or pin the page to one worker; do not silently switch to `{{w}}` and leave
 * the case naming an id that will not exist.
 *
 * 🛑 Offsets come from `at.*`, never `windowOffset()`. This directory is the
 * mechanism that REPLACES the shared window, and audit R4 is inverted here to
 * require it.
 */

import { at } from "../../../../../../tester/scripts/lib/fixtures.mjs";

const ID = "auction-money-flows-closing";
const STORE = "store-beyblade-arena";

/**
 * Three minutes: long enough for the tester to sign in, read the page, place a
 * bid and re-read it; short enough that "wait past the end time" is a real step
 * in a real session rather than an instruction nobody can follow.
 */
const CLOSES_IN_MINUTES = 3;

export const fixtures = [
  {
    collection: "products",
    id: ID,
    data: () => ({
      id: ID,
      slug: ID,
      title: "Closing Auction — Win to Payment",
      listingType: "auction",
      status: "published",
      currency: "INR",
      storeId: STORE,
      condition: "used",
      description:
        "Batch-scoped fixture. Closes a few minutes after this batch starts so the win-to-payment flow can be watched end to end.",
      mainImage: "/test-media/sample-image.png",
      images: [],
      categorySlugs: ["category-beyblade-burst"],
      // The case enters 16000 against a 15000 start and a 1000 increment, so
      // the minimum valid bid is exactly the number in its steps.
      price: 15000,
      startingBid: 15000,
      currentBid: 15000,
      bidIncrement: 1000,
      bidCount: 0,
      isSold: false,
      auctionStartDate: at.hoursAgo(1),
      auctionEndDate: at.minutesFromNow(CLOSES_IN_MINUTES),
      isTestData: true,
      createdAt: at.hoursAgo(1),
      updatedAt: at.hoursAgo(1),
    }),
  },
];
