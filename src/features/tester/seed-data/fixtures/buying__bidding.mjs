/*
 * Per-batch fixtures for buying/bidding.
 *
 * The bidding page is where the window mechanism failed hardest: 29 blocked
 * answers were expired fixtures, and `auction-tester-sandbox-cycle-1` closed 80
 * minutes into a 45-hour run, so every later bidding case read "Auction Ended".
 *
 * These four rows are created when the batch starts, so each is in exactly the
 * state its cases need at that moment — no window to divide, nothing to wait for:
 *
 *   live       ends in 2h   the ordinary case: place a bid, be outbid, win
 *   no-bids    ends in 2h   opening bid may EQUAL the starting price. A tester
 *                           reported "the Minimum preset bid (Rs 15,000 =
 *                           starting price) was rejected by client-side
 *                           validation" and could not isolate it, because every
 *                           seeded auction already had bids on it
 *   ended      ended 1h ago the archive/closed branch, true immediately rather
 *                           than after a wait
 *   with-bids  ends in 2h   thirteen bids, for pagination — the case wants three
 *                           pages at pageSize 5 and the seeded catalogue could
 *                           never guarantee that count
 */

import { at } from "../../../../../../tester/scripts/lib/fixtures.mjs";

const STORE = "store-beyblade-arena";
const SELLER = "user-tyson-blader";

const auction = (suffix, overrides) => ({
  collection: "products",
  id: `auction-{{w}}-${suffix}`,
  data: () => ({
    id: `auction-{{w}}-${suffix}`,
    slug: `auction-{{w}}-${suffix}`,
    listingType: "auction",
    status: "published",
    currency: "INR",
    storeId: STORE,
    condition: "used",
    mainImage: "/test-media/sample-image.png",
    images: [],
    categorySlugs: ["category-beyblade-burst"],
    isTestData: true,
    createdAt: at.hoursAgo(3),
    updatedAt: at.hoursAgo(3),
    ...overrides,
  }),
});

/** Thirteen bids so pagination at pageSize 5 has three pages, deterministically. */
const bidLadder = () =>
  Array.from({ length: 13 }, (_, i) => ({
    collection: "bids",
    id: `bid-{{w}}-ladder-${String(i + 1).padStart(2, "0")}`,
    data: () => ({
      id: `bid-{{w}}-ladder-${String(i + 1).padStart(2, "0")}`,
      productId: "auction-{{w}}-with-bids",
      productTitle: "Bid History Probe",
      userId: i % 2 === 0 ? "user-ananya-collector" : "user-rohit-collector",
      userName: i % 2 === 0 ? "Ananya Collector" : "Rohit Collector",
      bidAmount: 15_000 + (i + 1) * 500,
      currency: "INR",
      // Newest last, so "most recent first" is a real ordering assertion rather
      // than the order they happen to come back in.
      bidDate: at.minutesAgo(60 - i * 4),
      createdAt: at.minutesAgo(60 - i * 4),
      status: i === 12 ? "active" : "outbid",
      isTestData: true,
    }),
  }));

export const fixtures = [
  auction("live", {
    title: "Live Auction Probe",
    description: "An auction that is open for the whole of this batch.",
    price: 15_000,
    startingBid: 15_000,
    currentBid: 16_000,
    bidCount: 1,
    minBidIncrement: 500,
    auctionEndDate: at.hoursFromNow(2),
    sellerId: SELLER,
  }),
  auction("no-bids", {
    title: "Opening Bid Probe",
    description:
      "An auction with NO bids, so the opening bid can be tested against the starting price itself.",
    price: 15_000,
    startingBid: 15_000,
    currentBid: null,
    bidCount: 0,
    minBidIncrement: 500,
    auctionEndDate: at.hoursFromNow(2),
    sellerId: SELLER,
  }),
  auction("ended", {
    title: "Ended Auction Probe",
    description: "Already closed when the batch starts — the archive branch, with no waiting.",
    price: 12_000,
    startingBid: 12_000,
    currentBid: 13_500,
    bidCount: 3,
    minBidIncrement: 500,
    auctionEndDate: at.hoursAgo(1),
    isSold: true,
    sellerId: SELLER,
  }),
  auction("with-bids", {
    title: "Bid History Probe",
    description: "Thirteen bids, so Bid History has three pages at a page size of five.",
    price: 15_000,
    startingBid: 15_000,
    currentBid: 21_500,
    bidCount: 13,
    minBidIncrement: 500,
    auctionEndDate: at.hoursFromNow(2),
    sellerId: SELLER,
  }),
  ...bidLadder(),
];
