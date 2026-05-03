import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

/**
 * Bids Seed Data — Pokemon TCG Themed
 *
 * Auction bids for testing — focused on rare Pokemon card auctions.
 * All bids are in INR and priced realistically for vintage/graded Pokemon cards.
 *
 * Auctions referenced:
 *   1. auction-charizard-1st-ed-base1-4-fire-blaine-auction-1
 *      (1st Ed Charizard PSA 7 — starting ₹2,99,999 — 14 bids)
 *   2. auction-mewtwo-base1-10-psychic-surge-auction-1
 *      (Mewtwo PSA 9 — starting ₹49,999 — 6 bids)
 */

import type { BidDocument } from "../features/auctions/schemas";

// --- Dynamic date helpers ---------------------------------------------------
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const bidsSeedData: Partial<BidDocument>[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1st Edition Charizard Base Set #4 PSA 7 — 14 bids
  // auction-charizard-1st-ed-base1-4-fire-blaine-auction-1
  // Starting: ₹2,99,999 | Current: ₹3,49,999 | Reserve: ₹3,50,000
  // ═══════════════════════════════════════════════════════════════════════════

  // Bid 1 — Ash opens the bidding
  {
    id: "bid-charizard-1sted-ash-1-20260420-a1b2c3",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-ash-ketchum-pallet-ash",
    userName: "Ash Ketchum",
    userEmail: "ash@pallet.town",
    bidAmount: 299999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // Bid 2 — Gary counters
  {
    id: "bid-charizard-1sted-gary-1-20260420-d4e5f6",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-gary-oak-pallet-gary",
    userName: "Gary Oak",
    userEmail: "gary@pallet.town",
    bidAmount: 304999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // Bid 3 — Professor Oak enters
  {
    id: "bid-charizard-1sted-oak-1-20260421-g7h8i9",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-prof-oak-pallet-oak",
    userName: "Professor Oak",
    userEmail: "oak@pallettown.lab",
    bidAmount: 309999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },

  // Bid 4 — Ash raises
  {
    id: "bid-charizard-1sted-ash-2-20260421-j1k2l3",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-ash-ketchum-pallet-ash",
    userName: "Ash Ketchum",
    userEmail: "ash@pallet.town",
    bidAmount: 314999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    previousBidAmount: 299999,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // Bid 5 — Gary counters again
  {
    id: "bid-charizard-1sted-gary-2-20260422-m4n5o6",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-gary-oak-pallet-gary",
    userName: "Gary Oak",
    userEmail: "gary@pallet.town",
    bidAmount: 319999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    previousBidAmount: 304999,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // Bid 6 — Oak increases commitment
  {
    id: "bid-charizard-1sted-oak-2-20260422-p7q8r9",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-prof-oak-pallet-oak",
    userName: "Professor Oak",
    userEmail: "oak@pallettown.lab",
    bidAmount: 324999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    previousBidAmount: 309999,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // Bid 7 — Sabrina joins the auction
  {
    id: "bid-charizard-1sted-sabrina-1-20260423-s1t2u3",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-sabrina-saffron-sabrina",
    userName: "Sabrina",
    userEmail: "sabrina@saffron.gym",
    bidAmount: 329999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // Bid 8 — Ash makes a strong bid
  {
    id: "bid-charizard-1sted-ash-3-20260423-v4w5x6",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-ash-ketchum-pallet-ash",
    userName: "Ash Ketchum",
    userEmail: "ash@pallet.town",
    bidAmount: 334999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    previousBidAmount: 314999,
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // Bid 9 — Gary keeps pace
  {
    id: "bid-charizard-1sted-gary-3-20260424-y7z8a9",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-gary-oak-pallet-gary",
    userName: "Gary Oak",
    userEmail: "gary@pallet.town",
    bidAmount: 339999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    previousBidAmount: 319999,
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // Bid 10 — Brock wants the crown jewel too
  {
    id: "bid-charizard-1sted-brock-1-20260424-b1c2d3",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-brock-pewter-brock",
    userName: "Brock",
    userEmail: "brock@pewter.gym",
    bidAmount: 344999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // Bid 11 — Oak goes all in
  {
    id: "bid-charizard-1sted-oak-3-20260424-e4f5g6",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-prof-oak-pallet-oak",
    userName: "Professor Oak",
    userEmail: "oak@pallettown.lab",
    bidAmount: 349999,
    currency: _CURRENCY,
    status: "active",
    isWinning: true, // Current highest bid — auction still open
    previousBidAmount: 324999,
    autoMaxBid: 500000,
    bidDate: daysAgo(0),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },

  // -- CANCELLED bid — Sabrina withdrew before being outbid ------------------
  // Tests: cancel bid API, bid list filtered by status
  {
    id: "bid-charizard-1sted-sabrina-cancelled-20260423-h7i8j9",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    productTitle:
      "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
    userId: "user-sabrina-saffron-sabrina",
    userName: "Sabrina",
    userEmail: "sabrina@saffron.gym",
    bidAmount: 327500,
    currency: _CURRENCY,
    status: "cancelled",
    isWinning: false,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Mewtwo Base Set #10 PSA 9 — 6 bids
  // auction-mewtwo-base1-10-psychic-surge-auction-1
  // Starting: ₹49,999 | Current: ₹54,999 | Reserve: ₹55,000
  // ═══════════════════════════════════════════════════════════════════════════

  // Bid 1 — Sabrina opens (she loves Psychic cards)
  {
    id: "bid-mewtwo-psa9-sabrina-1-20260429-k1l2m3",
    productId: "auction-mewtwo-base1-10-psychic-surge-auction-1",
    productTitle: "Mewtwo — Base Set #10 Holo (AUCTION, PSA 9)",
    userId: "user-sabrina-saffron-sabrina",
    userName: "Sabrina",
    userEmail: "sabrina@saffron.gym",
    bidAmount: 49999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(5),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },

  // Bid 2 — Gary counters
  {
    id: "bid-mewtwo-psa9-gary-1-20260430-n4o5p6",
    productId: "auction-mewtwo-base1-10-psychic-surge-auction-1",
    productTitle: "Mewtwo — Base Set #10 Holo (AUCTION, PSA 9)",
    userId: "user-gary-oak-pallet-gary",
    userName: "Gary Oak",
    userEmail: "gary@pallet.town",
    bidAmount: 52499,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(4),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },

  // Bid 3 — Sabrina raises
  {
    id: "bid-mewtwo-psa9-sabrina-2-20260501-q7r8s9",
    productId: "auction-mewtwo-base1-10-psychic-surge-auction-1",
    productTitle: "Mewtwo — Base Set #10 Holo (AUCTION, PSA 9)",
    userId: "user-sabrina-saffron-sabrina",
    userName: "Sabrina",
    userEmail: "sabrina@saffron.gym",
    bidAmount: 54999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    previousBidAmount: 49999,
    bidDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },

  // Bid 4 — Ash places a bid
  {
    id: "bid-mewtwo-psa9-ash-1-20260501-t1u2v3",
    productId: "auction-mewtwo-base1-10-psychic-surge-auction-1",
    productTitle: "Mewtwo — Base Set #10 Holo (AUCTION, PSA 9)",
    userId: "user-ash-ketchum-pallet-ash",
    userName: "Ash Ketchum",
    userEmail: "ash@pallet.town",
    bidAmount: 57499,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // Bid 5 — Professor Oak bids
  {
    id: "bid-mewtwo-psa9-oak-1-20260502-w4x5y6",
    productId: "auction-mewtwo-base1-10-psychic-surge-auction-1",
    productTitle: "Mewtwo — Base Set #10 Holo (AUCTION, PSA 9)",
    userId: "user-prof-oak-pallet-oak",
    userName: "Professor Oak",
    userEmail: "oak@pallettown.lab",
    bidAmount: 59999,
    currency: _CURRENCY,
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // Bid 6 — Gary wins with current highest bid
  {
    id: "bid-mewtwo-psa9-gary-2-20260503-z7a8b9",
    productId: "auction-mewtwo-base1-10-psychic-surge-auction-1",
    productTitle: "Mewtwo — Base Set #10 Holo (AUCTION, PSA 9)",
    userId: "user-gary-oak-pallet-gary",
    userName: "Gary Oak",
    userEmail: "gary@pallet.town",
    bidAmount: 64999,
    currency: _CURRENCY,
    status: "active",
    isWinning: true,
    previousBidAmount: 52499,
    autoMaxBid: 85000,
    bidDate: daysAgo(0),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
];
