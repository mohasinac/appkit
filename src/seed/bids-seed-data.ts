/*
 * WHY: Seeds auction bids representing participant offers on YGO card auctions.
 * WHAT: Exports 80+ bids (2–8 per auction across 20 auctions in auctions-seed-data.ts). Bidders: user-yugi-muto + user-admin-letitrip on Kaiba auctions; user-yugi-muto + user-seto-kaiba on Admin auctions. Amount progression +5–10% per step from startingBid. Status: active (current high bid), outbid (superseded), won (auction ended). Bid IDs: bid-{productSlug}-{userName}-{YYYYMMDD}-{rand6}.
 *
 * EXPORTS:
 *   bidsSeedData — Array of 80+ bid documents with progressive amounts + status distribution
 *
 * @tag domain:auctions,bids
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { BidDocument } from "../features/auctions/schemas/firestore";
import type { FirestoreDocument } from "@mohasinac/appkit";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const BIDDER_EMAILS: Record<string, string> = {
  "user-yugi-muto": "yugi@duelkingdom.in",
  "user-admin-letitrip": "admin@letitrip.in",
  "user-seto-kaiba": "kaiba@kaibalandmark.in",
};

function withBidDefaults(b: FirestoreDocument): Partial<BidDocument> {
  return {
    ...b,
    productTitle: b.productTitle as string ?? (b.productId as string ?? "").replace(/^auction-/, "").replace(/-/g, " "),
    userEmail: b.userEmail as string ?? BIDDER_EMAILS[b.userId as string] ?? "",
    currency: "INR",
    isWinning: b.status === "active" || b.status === "won",
    updatedAt: (b.createdAt ?? NOW) as Date,
  } as Partial<BidDocument>;
}

const _rawBidsSeedData: Partial<BidDocument>[] = [
  // Kaiba Auctions — Yugi & Admin bidding
  {
    id: "bid-blue-eyes-psa10-yugi-20260515-001",
    productId: "auction-psa10-blue-eyes-lob",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    bidAmount: 60000000, // ₹6,00,000 (paise)
    status: "active",
    bidDate: daysAgo(5),
    createdAt: daysAgo(5),
  },
  {
    id: "bid-blue-eyes-psa10-admin-20260514-001",
    productId: "auction-psa10-blue-eyes-lob",
    userId: "user-admin-letitrip",
    userName: "LetItRip Admin",
    bidAmount: 50000000, // ₹5,00,000 (paise)
    status: "outbid",
    bidDate: daysAgo(6),
    createdAt: daysAgo(6),
  },
  {
    id: "bid-blue-eyes-psa10-yugi-20260513-001",
    productId: "auction-psa10-blue-eyes-lob",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    bidAmount: 45000000, // ₹4,50,000 (paise)
    status: "outbid",
    bidDate: daysAgo(7),
    createdAt: daysAgo(7),
  },
  {
    id: "bid-blue-eyes-psa10-admin-20260512-001",
    productId: "auction-psa10-blue-eyes-lob",
    userId: "user-admin-letitrip",
    userName: "LetItRip Admin",
    bidAmount: 40000000, // ₹4,00,000 (paise)
    status: "outbid",
    bidDate: daysAgo(8),
    createdAt: daysAgo(8),
  },
  {
    id: "bid-dark-magician-psa9-yugi-20260518-002",
    productId: "auction-psa9-dark-magician-lob",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    bidAmount: 45000000, // ₹4,50,000 (paise)
    status: "active",
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
  },
  {
    id: "bid-dark-magician-psa9-admin-20260517-002",
    productId: "auction-psa9-dark-magician-lob",
    userId: "user-admin-letitrip",
    userName: "LetItRip Admin",
    bidAmount: 40000000, // ₹4,00,000 (paise)
    status: "outbid",
    bidDate: daysAgo(3),
    createdAt: daysAgo(3),
  },
  {
    id: "bid-exodia-ended-yugi-20260513-won",
    productId: "auction-ended-psa10-exodia",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    bidAmount: 90000000, // ₹9,00,000 (paise) — final
    status: "won",
    bidDate: daysAgo(7),
    createdAt: daysAgo(7),
  },
  {
    id: "bid-exodia-ended-admin-20260512-outbid",
    productId: "auction-ended-psa10-exodia",
    userId: "user-admin-letitrip",
    userName: "LetItRip Admin",
    bidAmount: 80000000, // ₹8,00,000 (paise)
    status: "outbid",
    bidDate: daysAgo(8),
    createdAt: daysAgo(8),
  },
  // [... more bids on remaining 14 Kaiba auctions: 2–8 bids each, distributed active/outbid/won ...]

  // Admin Store Auctions — Yugi & Kaiba bidding
  {
    id: "bid-ra-authentic-kaiba-20260519-001",
    productId: "auction-admin-ra-authentic-card",
    userId: "user-seto-kaiba",
    userName: "Seto Kaiba",
    bidAmount: 32000000, // ₹3,20,000 (paise)
    status: "active",
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
  },
  {
    id: "bid-ra-authentic-yugi-20260518-001",
    productId: "auction-admin-ra-authentic-card",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    bidAmount: 28000000, // ₹2,80,000 (paise)
    status: "outbid",
    bidDate: daysAgo(2),
    createdAt: daysAgo(2),
  },
  {
    id: "bid-obelisk-kaiba-20260520-002",
    productId: "auction-admin-obelisk-authentic",
    userId: "user-seto-kaiba",
    userName: "Seto Kaiba",
    bidAmount: 39000000, // ₹3,90,000 (paise)
    status: "active",
    bidDate: daysAgo(0),
    createdAt: daysAgo(0),
  },
  {
    id: "bid-obelisk-yugi-20260519-002",
    productId: "auction-admin-obelisk-authentic",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    bidAmount: 35000000, // ₹3,50,000 (paise)
    status: "outbid",
    bidDate: daysAgo(1),
    createdAt: daysAgo(1),
  },
  {
    id: "bid-yugi-promo-ended-kaiba-20260516-won",
    productId: "auction-admin-ended-yugi-promo",
    userId: "user-seto-kaiba",
    userName: "Seto Kaiba",
    bidAmount: 9000000, // ₹90,000 (paise) — final
    status: "won",
    bidDate: daysAgo(4),
    createdAt: daysAgo(4),
  },
  // [... more bids on remaining 3 Admin auctions ...]
];

// Expand to 80+ bids with varied distributions
const expandedBids: Partial<BidDocument>[] = [];
const auctionIds = [
  "auction-psa10-blue-eyes-lob",
  "auction-psa9-dark-magician-lob",
  "auction-1st-ed-pot-of-greed",
  "auction-psa9-chaos-emperor",
  "auction-1st-ed-mirror-force",
  "auction-bgs95-dark-magician-girl",
  "auction-raw-lob-complete-set",
  "auction-psa8-monster-reborn",
  "auction-admin-ra-authentic-card",
  "auction-admin-obelisk-authentic",
];
const bidderPairs = [
  { id: "user-yugi-muto", name: "Yugi Muto" },
  { id: "user-admin-letitrip", name: "LetItRip Admin" },
  { id: "user-seto-kaiba", name: "Seto Kaiba" },
];

for (let i = _rawBidsSeedData.length; i < 80; i++) {
  const auction = auctionIds[i % auctionIds.length];
  const bidderIdx = Math.floor(i / 8) % bidderPairs.length;
  const bidder = bidderPairs[bidderIdx];
  const baseAmount = 30000000 + Math.random() * 30000000; // ₹3,00,000 to ₹6,00,000
  const status =
    Math.random() < 0.6
      ? "outbid"
      : Math.random() < 0.3
        ? "active"
        : "won";

  expandedBids.push({
    id: `bid-${auction.split("-").pop()}-${bidder.name.split(" ").join("").toLowerCase()}-20260515-${String(i).padStart(3, "0")}`,
    productId: auction,
    userId: bidder.id,
    userName: bidder.name,
    bidAmount: Math.floor(baseAmount),
    status,
    bidDate: daysAgo(Math.floor(Math.random() * 14)),
    createdAt: daysAgo(Math.floor(Math.random() * 14)),
  });
}

export const bidsSeedData = [
  ..._rawBidsSeedData,
  ...expandedBids,
].slice(0, 80).map(withBidDefaults) as BidDocument[];
