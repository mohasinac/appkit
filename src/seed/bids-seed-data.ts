/**
 * Bids Seed Data — Collectibles Edition
 * Realistic bid progressions for every auction with bidCount > 0.
 * Auctions with bidCount = 0 (upcoming / no-bid) are intentionally absent.
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

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-pokemon-lugia-neo-genesis-psa9 — active, 7 bids → ₹69,999
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-pokemon-lugia-neo-genesis-psa9",
    productTitle: "Pokémon Neo Genesis Lugia #9 Holo — PSA 9 MINT (AUCTION)",
    amounts: [3499900, 4000000, 4500000, 5000000, 5500000, 6000000, 6999900],
    bidders: [
      { id: "user-rahul-sharma", name: "Rahul Sharma", email: "rahul.sharma@gmail.com" },
      { id: "user-meera-nair", name: "Meera Nair", email: "meera.nair@gmail.com" },
      { id: "user-arjun-singh", name: "Arjun Singh", email: "arjun.singh@gmail.com" },
      { id: "user-kavya-iyer", name: "Kavya Iyer", email: "kavya.iyer@gmail.com" },
      { id: "user-priya-patel", name: "Priya Patel", email: "priya.patel@gmail.com" },
      { id: "user-rahul-sharma", name: "Rahul Sharma", email: "rahul.sharma@gmail.com" },
      { id: "user-arjun-singh", name: "Arjun Singh", email: "arjun.singh@gmail.com" },
    ],
    daysAgoForFirst: 9,
    endsActive: true,
    slugPrefix: "bid-lugia-neo",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-funko-stan-lee-glow-chase — active, 4 bids → ₹10,999
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-funko-stan-lee-glow-chase",
    productTitle: "Funko Pop Stan Lee Glow-in-the-Dark Chase Variant — Vaulted (AUCTION)",
    amounts: [599900, 749900, 899900, 1099900],
    bidders: [
      { id: "user-kartik-nair", name: "Kartik Nair", email: "kartik.nair@gmail.com" },
      { id: "user-sneha-kumar", name: "Sneha Kumar", email: "sneha.kumar@gmail.com" },
      { id: "user-naman-gupta", name: "Naman Gupta", email: "naman.gupta@gmail.com" },
      { id: "user-kartik-nair", name: "Kartik Nair", email: "kartik.nair@gmail.com" },
    ],
    daysAgoForFirst: 7,
    endsActive: true,
    slugPrefix: "bid-funko-stan-lee",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-beyblade-spriggan-requiem-tournament — active, 6 bids → ₹8,999
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-beyblade-spriggan-requiem-tournament",
    productTitle: "Beyblade Burst B-100 Spriggan Requiem — Tournament Limited Edition (AUCTION)",
    amounts: [399900, 499900, 599900, 699900, 799900, 899900],
    bidders: [
      { id: "user-aryan-kapoor", name: "Aryan Kapoor", email: "aryan.kapoor@gmail.com" },
      { id: "user-rohit-joshi", name: "Rohit Joshi", email: "rohit.joshi@gmail.com" },
      { id: "user-tanvi-desai", name: "Tanvi Desai", email: "tanvi.desai@gmail.com" },
      { id: "user-aryan-kapoor", name: "Aryan Kapoor", email: "aryan.kapoor@gmail.com" },
      { id: "user-ankit-gupta", name: "Ankit Gupta", email: "ankit.gupta@gmail.com" },
      { id: "user-tanvi-desai", name: "Tanvi Desai", email: "tanvi.desai@gmail.com" },
    ],
    daysAgoForFirst: 6,
    endsActive: true,
    slugPrefix: "bid-spriggan-req",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-shf-goku-ultra-instinct — ENDED (3 days ago), 6 bids → ₹14,999 WON
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-shf-goku-ultra-instinct",
    productTitle: "S.H.Figuarts Son Goku Ultra Instinct — Tamashii Limited (AUCTION ENDED)",
    amounts: [599900, 799900, 999900, 1199900, 1349900, 1499900],
    bidders: [
      { id: "user-rohit-verma", name: "Rohit Verma", email: "rohit.verma@gmail.com" },
      { id: "user-divya-menon", name: "Divya Menon", email: "divya.menon@gmail.com" },
      { id: "user-siddharth-rao", name: "Siddharth Rao", email: "siddharth.rao@gmail.com" },
      { id: "user-rohit-verma", name: "Rohit Verma", email: "rohit.verma@gmail.com" },
      { id: "user-pooja-sharma", name: "Pooja Sharma", email: "pooja.sharma@gmail.com" },
      { id: "user-divya-menon", name: "Divya Menon", email: "divya.menon@gmail.com" },
    ],
    daysAgoForFirst: 17,
    endsActive: false,
    closedDaysAgo: 3,
    winningIndex: 5,
    slugPrefix: "bid-goku-ui",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-pokemon-blastoise-shadowless-bgs — ENDED (14d ago), 8 bids → ₹39,999 WON
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-pokemon-blastoise-shadowless-bgs",
    productTitle: "Pokémon Base Set Shadowless Blastoise #2 Holo — BGS 8.5 (AUCTION ENDED)",
    amounts: [1499900, 1799900, 2099900, 2499900, 2899900, 3299900, 3599900, 3999900],
    bidders: [
      { id: "user-priya-singh", name: "Priya Singh", email: "priya.singh@gmail.com" },
      { id: "user-amit-sharma", name: "Amit Sharma", email: "amit.sharma@gmail.com" },
      { id: "user-arjun-singh", name: "Arjun Singh", email: "arjun.singh@gmail.com" },
      { id: "user-priya-singh", name: "Priya Singh", email: "priya.singh@gmail.com" },
      { id: "user-rahul-sharma", name: "Rahul Sharma", email: "rahul.sharma@gmail.com" },
      { id: "user-amit-sharma", name: "Amit Sharma", email: "amit.sharma@gmail.com" },
      { id: "user-arjun-singh", name: "Arjun Singh", email: "arjun.singh@gmail.com" },
      { id: "user-rahul-sharma", name: "Rahul Sharma", email: "rahul.sharma@gmail.com" },
    ],
    daysAgoForFirst: 28,
    endsActive: false,
    closedDaysAgo: 14,
    winningIndex: 7,
    slugPrefix: "bid-blastoise-sl",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-vintage-tomica-skyline-no-reserve-fail — ENDED no-winner, 3 bids
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-vintage-tomica-skyline-no-reserve-fail",
    productTitle: "Vintage Tomica Nissan Skyline GT-R Hakosuka 1973 — Reserve Not Met (AUCTION ENDED)",
    amounts: [199900, 349900, 499900],
    bidders: [
      { id: "user-kiran-reddy", name: "Kiran Reddy", email: "kiran.reddy@gmail.com" },
      { id: "user-preeti-joshi", name: "Preeti Joshi", email: "preeti.joshi@gmail.com" },
      { id: "user-varun-bhat", name: "Varun Bhat", email: "varun.bhat@gmail.com" },
    ],
    daysAgoForFirst: 20,
    endsActive: false,
    closedDaysAgo: 10,
    winningIndex: -1, // reserve not met — no winner
    slugPrefix: "bid-skyline-fail",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-nendoroid-miku-100-limited — ACTIVE, ends in 4h, 7 bids → current ₹11,999
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-nendoroid-miku-100-limited",
    productTitle:
      "Good Smile Company Nendoroid Hatsune Miku #100 (Original Release, Rare) — AUCTION",
    amounts: [499900, 599900, 699900, 799900, 899900, 1049900, 1199900],
    bidders: [
      { id: "user-priya-patel", name: "Priya Patel", email: "priya.patel@gmail.com" },
      { id: "user-divya-menon", name: "Divya Menon", email: "divya.menon@gmail.com" },
      { id: "user-priya-patel", name: "Priya Patel", email: "priya.patel@gmail.com" },
      { id: "user-pooja-sharma", name: "Pooja Sharma", email: "pooja.sharma@gmail.com" },
      { id: "user-divya-menon", name: "Divya Menon", email: "divya.menon@gmail.com" },
      { id: "user-meera-nair", name: "Meera Nair", email: "meera.nair@gmail.com" },
      { id: "user-priya-patel", name: "Priya Patel", email: "priya.patel@gmail.com" },
    ],
    daysAgoForFirst: 9,
    endsActive: true,
    slugPrefix: "bid-miku-100",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-pokemon-mew-1st-edition-psa10 — ACTIVE, ends in 24h, 3 bids → current ₹1,49,999
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-pokemon-mew-1st-edition-psa10",
    productTitle:
      "Pokémon Mew #151 1st Edition — PSA 10 GEM MINT (AUCTION)",
    amounts: [9999900, 12499900, 14999900],
    bidders: [
      { id: "user-arjun-singh", name: "Arjun Singh", email: "arjun.singh@gmail.com" },
      { id: "user-rahul-sharma", name: "Rahul Sharma", email: "rahul.sharma@gmail.com" },
      { id: "user-siddharth-rao", name: "Siddharth Rao", email: "siddharth.rao@gmail.com" },
    ],
    daysAgoForFirst: 5,
    endsActive: true,
    slugPrefix: "bid-mew-1ed",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-yugioh-blue-eyes-lob-1st-psa9 — ACTIVE, ends in 72h, 8 bids → current ₹79,999
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-yugioh-blue-eyes-lob-1st-psa9",
    productTitle:
      "Yu-Gi-Oh! Blue-Eyes White Dragon LOB 1st Edition — PSA 9 MINT (AUCTION)",
    amounts: [2999900, 3499900, 4249900, 4999900, 5749900, 6499900, 7249900, 7999900],
    bidders: [
      { id: "user-rahul-sharma", name: "Rahul Sharma", email: "rahul.sharma@gmail.com" },
      { id: "user-priya-singh", name: "Priya Singh", email: "priya.singh@gmail.com" },
      { id: "user-arjun-singh", name: "Arjun Singh", email: "arjun.singh@gmail.com" },
      { id: "user-amit-sharma", name: "Amit Sharma", email: "amit.sharma@gmail.com" },
      { id: "user-rahul-sharma", name: "Rahul Sharma", email: "rahul.sharma@gmail.com" },
      { id: "user-rohit-verma", name: "Rohit Verma", email: "rohit.verma@gmail.com" },
      { id: "user-priya-singh", name: "Priya Singh", email: "priya.singh@gmail.com" },
      { id: "user-arjun-singh", name: "Arjun Singh", email: "arjun.singh@gmail.com" },
    ],
    daysAgoForFirst: 7,
    endsActive: true,
    slugPrefix: "bid-bewd-lob",
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // auction-hot-wheels-redline-deora-japan — ACTIVE, ends in 36h, 5 bids → current ₹17,999
  // ═══════════════════════════════════════════════════════════════════════════
  ...buildBidLadder({
    productId: "auction-hot-wheels-redline-deora-japan",
    productTitle:
      "Hot Wheels Redline Deora — Japan Issue (AUCTION)",
    amounts: [899900, 1099900, 1299900, 1499900, 1799900],
    bidders: [
      { id: "user-varun-bhat", name: "Varun Bhat", email: "varun.bhat@gmail.com" },
      { id: "user-kiran-reddy", name: "Kiran Reddy", email: "kiran.reddy@gmail.com" },
      { id: "user-preeti-joshi", name: "Preeti Joshi", email: "preeti.joshi@gmail.com" },
      { id: "user-varun-bhat", name: "Varun Bhat", email: "varun.bhat@gmail.com" },
      { id: "user-meera-nair", name: "Meera Nair", email: "meera.nair@gmail.com" },
    ],
    daysAgoForFirst: 6,
    endsActive: true,
    slugPrefix: "bid-deora-jp",
  }),
];

interface BidLadderParams {
  productId: string;
  productTitle: string;
  amounts: number[];
  bidders: Array<{ id: string; name: string; email: string }>;
  daysAgoForFirst: number;
  endsActive: boolean;
  /** Days ago the auction closed. Required when endsActive=false. */
  closedDaysAgo?: number;
  /** Index of the winning bid for ended auctions. -1 if no winner (reserve unmet / zero bids). */
  winningIndex?: number;
  /** Prefix for bid IDs — typically a short auction tag. */
  slugPrefix: string;
}

/**
 * Builds a strictly-increasing bid ladder for an auction. Status flags are
 * applied so consumers can reason about isWinning + outbid history without
 * recomputing from raw amounts.
 */
function buildBidLadder({
  productId,
  productTitle,
  amounts,
  bidders,
  daysAgoForFirst,
  endsActive,
  closedDaysAgo,
  winningIndex,
  slugPrefix,
}: BidLadderParams): Partial<BidDocument>[] {
  if (amounts.length !== bidders.length) {
    throw new Error(
      `buildBidLadder: amounts.length (${amounts.length}) !== bidders.length (${bidders.length}) for ${productId}`,
    );
  }
  const last = amounts.length - 1;
  const winIdx = winningIndex ?? (endsActive ? -1 : last);
  return amounts.map((amount, i) => {
    const bidder = bidders[i];
    const isLast = i === last;
    // Spread bid times linearly across (first → now/close)
    const totalSpanDays = endsActive
      ? daysAgoForFirst
      : daysAgoForFirst - (closedDaysAgo ?? 0);
    const offsetDays = totalSpanDays * (1 - i / Math.max(1, last));
    const ageDays = (closedDaysAgo ?? 0) + offsetDays;
    const status: BidDocument["status"] =
      winIdx === i
        ? endsActive
          ? "active"
          : "won"
        : isLast && endsActive
          ? "active"
          : !endsActive && winIdx === -1
            ? "outbid"
            : "outbid";
    return {
      id: `${slugPrefix}-${bidder.id.replace("user-", "")}-${i + 1}`,
      productId,
      productTitle,
      userId: bidder.id,
      userName: bidder.name,
      userEmail: bidder.email,
      bidAmount: amount,
      currency: "INR" as const,
      status,
      isWinning: isLast && endsActive ? true : winIdx === i,
      previousBidAmount: i > 0 ? amounts[i - 1] : undefined,
      bidDate: daysAgo(ageDays),
      createdAt: daysAgo(ageDays),
      updatedAt: daysAgo(ageDays),
    };
  });
}
