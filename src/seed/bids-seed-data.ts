/**
 * Bids Seed Data — Collectibles Edition
 * Realistic bid progressions for the 4 active/ended auctions in P17.
 * Upcoming auction (auction-beyblade-metal-fusion-signed) has 0 bids.
 * Buyer IDs from P15 users seed data.
 */

import type { BidDocument } from "../features/auctions/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

export const bidsSeedData: Partial<BidDocument>[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // auction-pokemon-charizard-base1-psa9
  // Active, ending in 12h — 6 bids, current ₹2,99,999
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "bid-charizard-rahul-1",
    productId: "auction-pokemon-charizard-base1-psa9",
    productTitle:
      "Pokémon Base Set 1st Edition Charizard #4 Holo — PSA 9 MINT (AUCTION)",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    userEmail: "rahul.sharma@gmail.com",
    bidAmount: 9999900,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(14),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
  {
    id: "bid-charizard-priya-1",
    productId: "auction-pokemon-charizard-base1-psa9",
    productTitle:
      "Pokémon Base Set 1st Edition Charizard #4 Holo — PSA 9 MINT (AUCTION)",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    userEmail: "priya.patel@gmail.com",
    bidAmount: 12000000,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 9999900,
    bidDate: daysAgo(10),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    id: "bid-charizard-rahul-2",
    productId: "auction-pokemon-charizard-base1-psa9",
    productTitle:
      "Pokémon Base Set 1st Edition Charizard #4 Holo — PSA 9 MINT (AUCTION)",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    userEmail: "rahul.sharma@gmail.com",
    bidAmount: 15000000,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 12000000,
    bidDate: daysAgo(7),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: "bid-charizard-meera-1",
    productId: "auction-pokemon-charizard-base1-psa9",
    productTitle:
      "Pokémon Base Set 1st Edition Charizard #4 Holo — PSA 9 MINT (AUCTION)",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    userEmail: "meera.nair@gmail.com",
    bidAmount: 20000000,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 15000000,
    bidDate: daysAgo(4),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "bid-charizard-arjun-1",
    productId: "auction-pokemon-charizard-base1-psa9",
    productTitle:
      "Pokémon Base Set 1st Edition Charizard #4 Holo — PSA 9 MINT (AUCTION)",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    userEmail: "arjun.singh@gmail.com",
    bidAmount: 25000000,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 20000000,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "bid-charizard-rahul-3",
    productId: "auction-pokemon-charizard-base1-psa9",
    productTitle:
      "Pokémon Base Set 1st Edition Charizard #4 Holo — PSA 9 MINT (AUCTION)",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    userEmail: "rahul.sharma@gmail.com",
    bidAmount: 29999900,
    currency: "INR",
    status: "active",
    isWinning: true,
    previousBidAmount: 25000000,
    bidDate: hoursAgo(4),
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-yugioh-lob1-exodia-1st-psa8
  // Active, ending in 48h — 5 bids, current ₹49,999
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "bid-exodia-priya-1",
    productId: "auction-yugioh-lob1-exodia-1st-psa8",
    productTitle:
      "Yu-Gi-Oh! Exodia the Forbidden One — LOB-000 1st Edition PSA 8 NM-MT (AUCTION)",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    userEmail: "priya.patel@gmail.com",
    bidAmount: 1499900,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(7),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: "bid-exodia-arjun-1",
    productId: "auction-yugioh-lob1-exodia-1st-psa8",
    productTitle:
      "Yu-Gi-Oh! Exodia the Forbidden One — LOB-000 1st Edition PSA 8 NM-MT (AUCTION)",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    userEmail: "arjun.singh@gmail.com",
    bidAmount: 2000000,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 1499900,
    bidDate: daysAgo(5),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "bid-exodia-priya-2",
    productId: "auction-yugioh-lob1-exodia-1st-psa8",
    productTitle:
      "Yu-Gi-Oh! Exodia the Forbidden One — LOB-000 1st Edition PSA 8 NM-MT (AUCTION)",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    userEmail: "priya.patel@gmail.com",
    bidAmount: 2999900,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 2000000,
    bidDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "bid-exodia-rahul-1",
    productId: "auction-yugioh-lob1-exodia-1st-psa8",
    productTitle:
      "Yu-Gi-Oh! Exodia the Forbidden One — LOB-000 1st Edition PSA 8 NM-MT (AUCTION)",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    userEmail: "rahul.sharma@gmail.com",
    bidAmount: 3999900,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 2999900,
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "bid-exodia-priya-3",
    productId: "auction-yugioh-lob1-exodia-1st-psa8",
    productTitle:
      "Yu-Gi-Oh! Exodia the Forbidden One — LOB-000 1st Edition PSA 8 NM-MT (AUCTION)",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    userEmail: "priya.patel@gmail.com",
    bidAmount: 4999900,
    currency: "INR",
    status: "active",
    isWinning: true,
    previousBidAmount: 3999900,
    bidDate: hoursAgo(12),
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(12),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-hot-wheels-redline-camaro-pink
  // Active, ending in 6h — 4 bids, current ₹12,999
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "bid-hpink-meera-1",
    productId: "auction-hot-wheels-redline-camaro-pink",
    productTitle:
      "Hot Wheels Redline 1967 Custom Camaro — Spectraflame Pink (Vintage, AUCTION)",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    userEmail: "meera.nair@gmail.com",
    bidAmount: 499900,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    bidDate: daysAgo(5),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "bid-hpink-arjun-1",
    productId: "auction-hot-wheels-redline-camaro-pink",
    productTitle:
      "Hot Wheels Redline 1967 Custom Camaro — Spectraflame Pink (Vintage, AUCTION)",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    userEmail: "arjun.singh@gmail.com",
    bidAmount: 750000,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 499900,
    bidDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "bid-hpink-meera-2",
    productId: "auction-hot-wheels-redline-camaro-pink",
    productTitle:
      "Hot Wheels Redline 1967 Custom Camaro — Spectraflame Pink (Vintage, AUCTION)",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    userEmail: "meera.nair@gmail.com",
    bidAmount: 1000000,
    currency: "INR",
    status: "outbid",
    isWinning: false,
    previousBidAmount: 750000,
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "bid-hpink-arjun-2",
    productId: "auction-hot-wheels-redline-camaro-pink",
    productTitle:
      "Hot Wheels Redline 1967 Custom Camaro — Spectraflame Pink (Vintage, AUCTION)",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    userEmail: "arjun.singh@gmail.com",
    bidAmount: 1299900,
    currency: "INR",
    status: "active",
    isWinning: true,
    previousBidAmount: 1000000,
    bidDate: hoursAgo(3),
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-gundam-pg-strike-freedom-box
  // Ended 7 days ago — 6 bids, final ₹29,999, winner: user-priya-patel
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "bid-gundam-arjun-1",
    productId: "auction-gundam-pg-strike-freedom-box",
    productTitle:
      "Bandai Gunpla PG 1/60 Strike Freedom Gundam — Factory Sealed (AUCTION ENDED)",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    userEmail: "arjun.singh@gmail.com",
    bidAmount: 999900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    bidDate: daysAgo(21),
    createdAt: daysAgo(21),
    updatedAt: daysAgo(7),
  },
  {
    id: "bid-gundam-priya-1",
    productId: "auction-gundam-pg-strike-freedom-box",
    productTitle:
      "Bandai Gunpla PG 1/60 Strike Freedom Gundam — Factory Sealed (AUCTION ENDED)",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    userEmail: "priya.patel@gmail.com",
    bidAmount: 1499900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    previousBidAmount: 999900,
    bidDate: daysAgo(18),
    createdAt: daysAgo(18),
    updatedAt: daysAgo(7),
  },
  {
    id: "bid-gundam-arjun-2",
    productId: "auction-gundam-pg-strike-freedom-box",
    productTitle:
      "Bandai Gunpla PG 1/60 Strike Freedom Gundam — Factory Sealed (AUCTION ENDED)",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    userEmail: "arjun.singh@gmail.com",
    bidAmount: 1999900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    previousBidAmount: 1499900,
    bidDate: daysAgo(14),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(7),
  },
  {
    id: "bid-gundam-priya-2",
    productId: "auction-gundam-pg-strike-freedom-box",
    productTitle:
      "Bandai Gunpla PG 1/60 Strike Freedom Gundam — Factory Sealed (AUCTION ENDED)",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    userEmail: "priya.patel@gmail.com",
    bidAmount: 2499900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    previousBidAmount: 1999900,
    bidDate: daysAgo(11),
    createdAt: daysAgo(11),
    updatedAt: daysAgo(7),
  },
  {
    id: "bid-gundam-arjun-3",
    productId: "auction-gundam-pg-strike-freedom-box",
    productTitle:
      "Bandai Gunpla PG 1/60 Strike Freedom Gundam — Factory Sealed (AUCTION ENDED)",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    userEmail: "arjun.singh@gmail.com",
    bidAmount: 2799900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    previousBidAmount: 2499900,
    bidDate: daysAgo(9),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
  },
  {
    id: "bid-gundam-priya-3",
    productId: "auction-gundam-pg-strike-freedom-box",
    productTitle:
      "Bandai Gunpla PG 1/60 Strike Freedom Gundam — Factory Sealed (AUCTION ENDED)",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    userEmail: "priya.patel@gmail.com",
    bidAmount: 2999900,
    currency: "INR",
    status: "won",
    isWinning: true,
    previousBidAmount: 2799900,
    bidDate: daysAgo(7),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-bandai-dbz-bulma-vintage
  // Ended 30 days ago — 5 bids, final ₹7,999, winner: user-meera-nair
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "bid-bulma-rahul-1",
    productId: "auction-bandai-dbz-bulma-vintage",
    productTitle:
      "Bandai Dragon Ball Z Bulma Vintage Figure — 1989 First-Run (AUCTION ENDED)",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    userEmail: "rahul.sharma@gmail.com",
    bidAmount: 299900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    bidDate: daysAgo(45),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(30),
  },
  {
    id: "bid-bulma-meera-1",
    productId: "auction-bandai-dbz-bulma-vintage",
    productTitle:
      "Bandai Dragon Ball Z Bulma Vintage Figure — 1989 First-Run (AUCTION ENDED)",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    userEmail: "meera.nair@gmail.com",
    bidAmount: 499900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    previousBidAmount: 299900,
    bidDate: daysAgo(42),
    createdAt: daysAgo(42),
    updatedAt: daysAgo(30),
  },
  {
    id: "bid-bulma-rahul-2",
    productId: "auction-bandai-dbz-bulma-vintage",
    productTitle:
      "Bandai Dragon Ball Z Bulma Vintage Figure — 1989 First-Run (AUCTION ENDED)",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    userEmail: "rahul.sharma@gmail.com",
    bidAmount: 599900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    previousBidAmount: 499900,
    bidDate: daysAgo(38),
    createdAt: daysAgo(38),
    updatedAt: daysAgo(30),
  },
  {
    id: "bid-bulma-meera-2",
    productId: "auction-bandai-dbz-bulma-vintage",
    productTitle:
      "Bandai Dragon Ball Z Bulma Vintage Figure — 1989 First-Run (AUCTION ENDED)",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    userEmail: "meera.nair@gmail.com",
    bidAmount: 699900,
    currency: "INR",
    status: "lost",
    isWinning: false,
    previousBidAmount: 599900,
    bidDate: daysAgo(33),
    createdAt: daysAgo(33),
    updatedAt: daysAgo(30),
  },
  {
    id: "bid-bulma-meera-3",
    productId: "auction-bandai-dbz-bulma-vintage",
    productTitle:
      "Bandai Dragon Ball Z Bulma Vintage Figure — 1989 First-Run (AUCTION ENDED)",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    userEmail: "meera.nair@gmail.com",
    bidAmount: 799900,
    currency: "INR",
    status: "won",
    isWinning: true,
    previousBidAmount: 699900,
    bidDate: daysAgo(30),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
];
