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

  // ═══════════════════════════════════════════════════════════════════════════
  // Beyblade: Astral Spriggan QuadDrive — 9 bids
  // auction-bb-astral-spriggan-rare-bp-1
  // Start: ₹2,999 | Current: ₹3,700 | Inc: ₹250
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-bb-astral-spriggan-mh-1", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-metal-hiro-beyblade", userName: "Metal Hiro", userEmail: "metal.hiro@letitrip.in", bidAmount: 2999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-bb-astral-spriggan-riku-1", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-riku-beyblade-fan", userName: "Riku Blader", userEmail: "riku.blader@letitrip.in", bidAmount: 3100, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-bb-astral-spriggan-ash-1", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 3200, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-bb-astral-spriggan-mh-2", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-metal-hiro-beyblade", userName: "Metal Hiro", userEmail: "metal.hiro@letitrip.in", bidAmount: 3350, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 2999, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-bb-astral-spriggan-riku-2", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-riku-beyblade-fan", userName: "Riku Blader", userEmail: "riku.blader@letitrip.in", bidAmount: 3450, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3100, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-bb-astral-spriggan-priya-1", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 3550, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-bb-astral-spriggan-ash-2", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 3600, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3200, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-bb-astral-spriggan-mh-3", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-metal-hiro-beyblade", userName: "Metal Hiro", userEmail: "metal.hiro@letitrip.in", bidAmount: 3650, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3350, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-bb-astral-spriggan-riku-3", productId: "auction-bb-astral-spriggan-rare-bp-1", productTitle: "AUCTION — Beyblade Burst QuadDrive Astral Spriggan Rare", userId: "user-riku-beyblade-fan", userName: "Riku Blader", userEmail: "riku.blader@letitrip.in", bidAmount: 3700, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 3450, autoMaxBid: 4200, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Beyblade: Dead Phoenix Hasbro Limited — 12 bids
  // auction-bb-dead-phoenix-limited-bp-2
  // Start: ₹3,499 | Current: ₹4,200 | Inc: ₹250
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-bb-dead-phoenix-ash-1", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 3499, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-bb-dead-phoenix-gary-1", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 3600, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-bb-dead-phoenix-mh-1", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-metal-hiro-beyblade", userName: "Metal Hiro", userEmail: "metal.hiro@letitrip.in", bidAmount: 3700, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-bb-dead-phoenix-riku-1", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-riku-beyblade-fan", userName: "Riku Blader", userEmail: "riku.blader@letitrip.in", bidAmount: 3800, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-bb-dead-phoenix-ash-2", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 3850, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3499, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-bb-dead-phoenix-priya-1", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 3900, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-bb-dead-phoenix-gary-2", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 3950, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3600, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-bb-dead-phoenix-mh-2", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-metal-hiro-beyblade", userName: "Metal Hiro", userEmail: "metal.hiro@letitrip.in", bidAmount: 4000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3700, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-bb-dead-phoenix-riku-2", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-riku-beyblade-fan", userName: "Riku Blader", userEmail: "riku.blader@letitrip.in", bidAmount: 4050, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3800, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-bb-dead-phoenix-ash-3", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 4100, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3850, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-bb-dead-phoenix-priya-2", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 4150, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 3900, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },
  { id: "bid-bb-dead-phoenix-gary-3", productId: "auction-bb-dead-phoenix-limited-bp-2", productTitle: "AUCTION — Beyblade Burst Evolution Dead Phoenix Hasbro Limited", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 4200, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 3950, autoMaxBid: 5500, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Hot Wheels: STH GTO Judge '70 — 11 bids
  // auction-hw-sth-gto-judge-70-auction-sk-1
  // Start: ₹4,999 | Current: ₹6,500 | Inc: ₹500
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-hw-gto-wk-1", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 4999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-hw-gto-ash-1", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 5300, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-hw-gto-gary-1", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 5600, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-hw-gto-priya-1", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 5800, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-hw-gto-wk-2", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 6000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 4999, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-hw-gto-brock-1", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 6100, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-hw-gto-ash-2", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 6200, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 5300, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-hw-gto-dawn-1", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-dawn-sinnoh-buyer", userName: "Dawn (Sinnoh)", userEmail: "dawn.sinnoh@letitrip.in", bidAmount: 6250, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-hw-gto-gary-2", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 6300, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 5600, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-hw-gto-wk-3", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 6400, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 6000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-hw-gto-priya-2", productId: "auction-hw-sth-gto-judge-70-auction-sk-1", productTitle: "AUCTION — Hot Wheels Super Treasure Hunt GTO Judge '70", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 6500, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 5800, autoMaxBid: 9000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Hot Wheels: RLC Twin Mill Redline — 8 bids
  // auction-hw-rlc-twin-mill-redline-auction-sk-2
  // Start: ₹7,999 | Current: ₹9,500 | Inc: ₹500
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-hw-twinmill-wk-1", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 7999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-hw-twinmill-ash-1", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 8300, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-hw-twinmill-priya-1", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 8600, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-hw-twinmill-gary-1", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 8800, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-hw-twinmill-wk-2", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 9000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 7999, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-hw-twinmill-ash-2", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 9100, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 8300, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-hw-twinmill-priya-2", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 9300, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 8600, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-hw-twinmill-gary-2", productId: "auction-hw-rlc-twin-mill-redline-auction-sk-2", productTitle: "AUCTION — Hot Wheels RLC Twin Mill Redline Club", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 9500, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 8800, autoMaxBid: 14000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Hot Wheels: Countach 1:18 Scale — 15 bids
  // auction-hw-countach-118-scale-auction-sk-3
  // Start: ₹14,999 | Current: ₹18,500 | Inc: ₹1,000
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-hw-countach-wk-1", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 14999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(8), createdAt: daysAgo(8), updatedAt: daysAgo(8) },
  { id: "bid-hw-countach-ash-1", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 15300, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-hw-countach-gary-1", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 15700, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-hw-countach-brock-1", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 16000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-hw-countach-dawn-1", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-dawn-sinnoh-buyer", userName: "Dawn (Sinnoh)", userEmail: "dawn.sinnoh@letitrip.in", bidAmount: 16300, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-hw-countach-priya-1", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 16600, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-hw-countach-wk-2", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 16900, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 14999, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-hw-countach-ash-2", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 17200, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 15300, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-hw-countach-gary-2", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 17500, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 15700, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-hw-countach-brock-2", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 17800, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 16000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-hw-countach-dawn-2", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-dawn-sinnoh-buyer", userName: "Dawn (Sinnoh)", userEmail: "dawn.sinnoh@letitrip.in", bidAmount: 18000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 16300, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-hw-countach-priya-2", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 18100, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 16600, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-hw-countach-wk-3", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 18200, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 16900, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-hw-countach-ash-3", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 18350, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 17200, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },
  { id: "bid-hw-countach-gary-3", productId: "auction-hw-countach-118-scale-auction-sk-3", productTitle: "AUCTION — Hot Wheels Countach 1:18 Scale Collector", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 18500, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 17500, autoMaxBid: 24000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Anime: DBZ Goku 1st Edition Graded — 14 bids
  // auction-av-dbz-goku-first-edition-graded-av-1
  // Start: ₹24,999 | Current: ₹38,000 | Inc: ₹2,000
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-av-goku-priya-1", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 24999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(8), createdAt: daysAgo(8), updatedAt: daysAgo(8) },
  { id: "bid-av-goku-ash-1", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 27000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-av-goku-gary-1", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 29000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-av-goku-optimus-1", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 31000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-av-goku-priya-2", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 33000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 24999, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-av-goku-brock-1", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 33500, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-av-goku-ash-2", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 34000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 27000, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-av-goku-gary-2", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 35000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 29000, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-av-goku-optimus-2", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 35500, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 31000, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-av-goku-priya-3", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 36000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 33000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-av-goku-ash-3", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 36500, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 34000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-av-goku-gary-3", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 37000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 35000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-av-goku-brock-2", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 37500, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 33500, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-av-goku-optimus-3", productId: "auction-av-dbz-goku-first-edition-graded-av-1", productTitle: "AUCTION — DBZ Goku First Edition Graded Figure", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 38000, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 35500, autoMaxBid: 65000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Anime: One Piece Luffy Gear 5 First Print — 9 bids
  // auction-av-onepiece-luffy-gear5-first-print-av-2
  // Start: ₹9,999 | Current: ₹22,000 | Inc: ₹1,000
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-av-luffy-ash-1", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 9999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-av-luffy-gary-1", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 12000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-av-luffy-priya-1", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 14000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-av-luffy-brock-1", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 16000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-av-luffy-ash-2", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 18000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 9999, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-av-luffy-gary-2", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 19000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 12000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-av-luffy-priya-2", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 20000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 14000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-av-luffy-brock-2", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 21000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 16000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-av-luffy-ash-3", productId: "auction-av-onepiece-luffy-gear5-first-print-av-2", productTitle: "AUCTION — One Piece Luffy Gear 5 First Print Figure", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 22000, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 18000, autoMaxBid: 35000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Retro Gaming: NES Punch-Out!! Sealed — 11 bids
  // auction-rg-nes-punch-out-sealed-rg-1
  // Start: ₹14,999 | Current: ₹22,000 | Inc: ₹1,000
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-rg-punchout-ash-1", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 14999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-rg-punchout-gary-1", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "ash.ketchum@letitrip.in", bidAmount: 16000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-rg-punchout-brock-1", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 17000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-rg-punchout-optimus-1", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 18000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-rg-punchout-priya-1", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 18500, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-rg-punchout-ash-2", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 19000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 14999, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-rg-punchout-gary-2", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 19500, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 16000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-rg-punchout-brock-2", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 20000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 17000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-rg-punchout-optimus-2", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 20500, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 18000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-rg-punchout-priya-2", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 21000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 18500, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-rg-punchout-ash-3", productId: "auction-rg-nes-punch-out-sealed-rg-1", productTitle: "AUCTION — NES Punch-Out!! Sealed WATA Graded", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 22000, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 19000, autoMaxBid: 32000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Cosplay: Signed DBZ Cell Game Artwork — 8 bids
  // auction-cp-signed-dbz-cell-game-art-cp-1
  // Start: ₹14,999 | Current: ₹26,000 | Inc: ₹2,000
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-cp-dbzart-priya-1", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 14999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-cp-dbzart-ash-1", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 17000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-cp-dbzart-optimus-1", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 19000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-cp-dbzart-gary-1", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 21000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-cp-dbzart-priya-2", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 22000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 14999, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-cp-dbzart-ash-2", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 23000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 17000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-cp-dbzart-optimus-2", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 25000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 19000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-cp-dbzart-gary-2", productId: "auction-cp-signed-dbz-cell-game-art-cp-1", productTitle: "AUCTION — Signed DBZ Cell Game Original Artwork", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 26000, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 21000, autoMaxBid: 45000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },

  // ═══════════════════════════════════════════════════════════════════════════
  // Transformers: G1 Optimus Prime 1984 MISB — 22 bids
  // auction-tf-g1-optimus-prime-1984-misb-sk-1
  // Start: ₹99,999 | Current: ₹1,45,000 | Inc: ₹5,000
  // ═══════════════════════════════════════════════════════════════════════════
  { id: "bid-tf-optimus-opt-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 99999, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(10), createdAt: daysAgo(10), updatedAt: daysAgo(10) },
  { id: "bid-tf-optimus-ash-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 105000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(9), createdAt: daysAgo(9), updatedAt: daysAgo(9) },
  { id: "bid-tf-optimus-gary-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 110000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(9), createdAt: daysAgo(9), updatedAt: daysAgo(9) },
  { id: "bid-tf-optimus-brock-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 113000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(8), createdAt: daysAgo(8), updatedAt: daysAgo(8) },
  { id: "bid-tf-optimus-dawn-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-dawn-sinnoh-buyer", userName: "Dawn (Sinnoh)", userEmail: "dawn.sinnoh@letitrip.in", bidAmount: 115000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(8), createdAt: daysAgo(8), updatedAt: daysAgo(8) },
  { id: "bid-tf-optimus-may-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-may-hoenn-buyer", userName: "May (Hoenn)", userEmail: "may.hoenn@letitrip.in", bidAmount: 117000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-tf-optimus-priya-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 119000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(7), createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: "bid-tf-optimus-wk-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 121000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-tf-optimus-riku-1", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-riku-beyblade-fan", userName: "Riku Blader", userEmail: "riku.blader@letitrip.in", bidAmount: 123000, currency: _CURRENCY, status: "outbid", isWinning: false, bidDate: daysAgo(6), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: "bid-tf-optimus-opt-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 125000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 99999, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-tf-optimus-ash-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 127000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 105000, bidDate: daysAgo(5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: "bid-tf-optimus-gary-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 129000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 110000, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-tf-optimus-brock-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 131000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 113000, bidDate: daysAgo(4), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: "bid-tf-optimus-dawn-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-dawn-sinnoh-buyer", userName: "Dawn (Sinnoh)", userEmail: "dawn.sinnoh@letitrip.in", bidAmount: 133000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 115000, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-tf-optimus-may-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-may-hoenn-buyer", userName: "May (Hoenn)", userEmail: "may.hoenn@letitrip.in", bidAmount: 135000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 117000, bidDate: daysAgo(3), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "bid-tf-optimus-priya-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-priya-collector", userName: "Priya Collector", userEmail: "priya.collector@letitrip.in", bidAmount: 137000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 119000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-tf-optimus-wk-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-wheels-king-hw", userName: "Wheels King", userEmail: "wheels.king@letitrip.in", bidAmount: 139000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 121000, bidDate: daysAgo(2), createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { id: "bid-tf-optimus-riku-2", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-riku-beyblade-fan", userName: "Riku Blader", userEmail: "riku.blader@letitrip.in", bidAmount: 140000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 123000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-tf-optimus-opt-3", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-optimus-collector", userName: "Optimus Collector", userEmail: "optimus.collector@letitrip.in", bidAmount: 141000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 125000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-tf-optimus-ash-3", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-ash-ketchum-buyer", userName: "Ash Ketchum", userEmail: "ash.ketchum@letitrip.in", bidAmount: 142000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 127000, bidDate: daysAgo(1), createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "bid-tf-optimus-gary-3", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-gary-oak-buyer", userName: "Gary Oak", userEmail: "gary.oak@letitrip.in", bidAmount: 143000, currency: _CURRENCY, status: "outbid", isWinning: false, previousBidAmount: 129000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },
  { id: "bid-tf-optimus-brock-3", productId: "auction-tf-g1-optimus-prime-1984-misb-sk-1", productTitle: "AUCTION — G1 Optimus Prime 1984 MISB", userId: "user-brock-pewter-buyer", userName: "Brock Pewter", userEmail: "brock.pewter@letitrip.in", bidAmount: 145000, currency: _CURRENCY, status: "active", isWinning: true, previousBidAmount: 131000, autoMaxBid: 200000, bidDate: daysAgo(0), createdAt: daysAgo(0), updatedAt: daysAgo(0) },
];
