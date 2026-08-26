/*
 * WHY: Seeds auction bids representing participant offers on the live Beyblade auctions
 *      in products-auctions-seed-data.ts.
 * WHAT: Exports bids for the 2 seeded auctions (auction-beyblade-original-dragoon-storm,
 *       auction-beyblade-metal-lightning-l-drago) — bid counts and final amounts match
 *       each auction's `bidCount`/`currentBid` fields exactly, so the product card's
 *       "N bids" summary and the detail page's bid-history list agree. Bidders: 3 buyer
 *       personas (Mock User 11, Mock User 14, Mock User 9), never the store's own seller
 *       (user-tyson-blader owns store-beyblade-arena). Status: newest bid per auction is
 *       "active", the rest "outbid". Bid IDs: bid-{productSlug}-{userName}-{YYYYMMDD}-{rand6}.
 *       L-Drago's ladder is deliberately 13 bids deep (cycling the 3 personas) so the
 *       auction detail page's paginated Bid History section (pageSize 5) and the /user/bids
 *       dashboard both have real multi-page data to exercise — see CollapsibleBidHistory.tsx.
 *
 * EXPORTS:
 *   bidsSeedData — Array of bid documents, one set per seeded auction, counts matching
 *                  each auction's bidCount field
 *
 * @tag domain:auctions,bids
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { BidDocument } from "../features/auctions/schemas/firestore";
import type { FirestoreDocument } from "@mohasinac/appkit";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const BIDDER_EMAILS: Record<string, string> = {
  "user-meera-bey": "meera.blader@gmail.com",
  "user-rohit-collector": "rohit.collect@gmail.com",
  "user-ananya-collector": "ananya.patel@gmail.com",
};

const BIDDER_NAMES: Record<string, string> = {
  "user-meera-bey": "Mock User 11",
  "user-rohit-collector": "Mock User 14",
  "user-ananya-collector": "Mock User 9",
};

/*
 * Typed on the document, not `FirestoreDocument`. Once `BidDocument` gained
 * `statusHistory?: StatusChangeEntry[]`, `Partial<BidDocument>` stopped being
 * assignable to `FirestoreDocument` — an array of objects does not satisfy
 * that index signature. The right fix is to narrow the parameter to what the
 * caller actually passes rather than widen the document to keep a helper
 * happy.
 */
function withBidDefaults(b: Partial<BidDocument>): Partial<BidDocument> {
  return {
    ...b,
    productTitle: b.productTitle as string ?? (b.productId as string ?? "").replace(/^auction-/, "").replace(/-/g, " "),
    userEmail: b.userEmail as string ?? BIDDER_EMAILS[b.userId as string] ?? "",
    currency: "INR",
    isWinning: b.status === "active" || b.status === "won",
    updatedAt: (b.createdAt ?? NOW) as Date,
  } as Partial<BidDocument>;
}

/**
 * One ascending bid ladder per auction. By default the last entry is "active"
 * and the rest "outbid" (a live auction). Pass `closed:true` for an ended
 * auction — the last entry becomes "won" and the rest "lost".
 */
function buildLadder(params: {
  productId: string;
  productTitle: string;
  startingBid: number;
  currentBid: number;
  bidderIds: string[];
  closed?: boolean;
}): Partial<BidDocument>[] {
  const { productId, productTitle, startingBid, currentBid, bidderIds, closed = false } = params;
  const steps = bidderIds.length;
  const range = currentBid - startingBid;
  return bidderIds.map((userId, i) => {
    const amount = i === steps - 1 ? currentBid : Math.round(startingBid + (range * (i + 1)) / (steps + 1));
    const daysBack = steps - i;
    const isFinal = i === steps - 1;
    return {
      id: `bid-${productId.replace(/^auction-/, "")}-${userId.replace(/^user-/, "")}-20260601-${String(i).padStart(3, "0")}`,
      productId,
      productTitle,
      userId,
      userName: BIDDER_NAMES[userId] ?? userId,
      bidAmount: amount,
      status: isFinal ? (closed ? "won" : "active") : (closed ? "lost" : "outbid"),
      bidDate: daysAgo(daysBack),
      createdAt: daysAgo(daysBack),
    };
  });
}

const _rawBidsSeedData: Partial<BidDocument>[] = [
  // auction-beyblade-original-dragoon-storm — bidCount: 3, currentBid: 3499
  ...buildLadder({
    productId: "auction-beyblade-original-dragoon-storm",
    productTitle: "Beyblade Original — Dragoon Storm (Rare Sealed)",
    startingBid: 2999,
    currentBid: 3499,
    bidderIds: ["user-rohit-collector", "user-ananya-collector", "user-meera-bey"],
  }),

  // auction-beyblade-metal-lightning-l-drago — bidCount: 13, currentBid: 3199
  // Deliberately deep ladder (see file header) to exercise Bid History pagination.
  ...buildLadder({
    productId: "auction-beyblade-metal-lightning-l-drago",
    productTitle: "Metal Fight Beyblade BB-99 Lightning L-Drago",
    startingBid: 1999,
    currentBid: 3199,
    bidderIds: [
      "user-meera-bey",
      "user-rohit-collector",
      "user-ananya-collector",
      "user-rohit-collector",
      "user-meera-bey",
      "user-ananya-collector",
      "user-rohit-collector",
      "user-meera-bey",
      "user-ananya-collector",
      "user-rohit-collector",
      "user-meera-bey",
      "user-ananya-collector",
      "user-rohit-collector",
    ],
  }),

  // auction-beyblade-original-seaborg — bidCount: 4, currentBid: 2200 (reserve 4000 not met)
  ...buildLadder({
    productId: "auction-beyblade-original-seaborg",
    productTitle: "Beyblade Original — Seaborg 2000 (Reserve Auction)",
    startingBid: 1499,
    currentBid: 2200,
    bidderIds: ["user-ananya-collector", "user-meera-bey", "user-rohit-collector", "user-ananya-collector"],
  }),

  // auction-beyblade-metal-diablo-nemesis — bidCount: 6, currentBid: 6200, CLOSED (won by user-rohit-collector)
  ...buildLadder({
    productId: "auction-beyblade-metal-diablo-nemesis",
    productTitle: "Metal Fight Beyblade BB-122 Diablo Nemesis (Ended — Sold)",
    startingBid: 3499,
    currentBid: 6200,
    bidderIds: [
      "user-meera-bey",
      "user-ananya-collector",
      "user-meera-bey",
      "user-ananya-collector",
      "user-meera-bey",
      "user-rohit-collector",
    ],
    closed: true,
  }),

  // auction-beyblade-burst-cho-z-achilles — bidCount: 2, currentBid: 1650
  ...buildLadder({
    productId: "auction-beyblade-burst-cho-z-achilles",
    productTitle: "Beyblade Burst B-100 Cho-Z Achilles",
    startingBid: 1199,
    currentBid: 1650,
    bidderIds: ["user-rohit-collector", "user-meera-bey"],
  }),

  // auction-beyblade-x-wizard-fafnir — bidCount: 3, currentBid: 1450
  ...buildLadder({
    productId: "auction-beyblade-x-wizard-fafnir",
    productTitle: "Beyblade X BX-06 Wizard Fafnir (Long-Running Auction)",
    startingBid: 999,
    currentBid: 1450,
    bidderIds: ["user-ananya-collector", "user-rohit-collector", "user-meera-bey"],
  }),

  // auction-beyblade-burst-spriggan-requiem-bought-out — a BUYOUT ended it.
  //
  // Three competitive bids that lost, then the buyout that won. A buyout is a
  // real BidDocument (`isBuyout: true`) — it is not a bid-free purchase, which
  // is why the order's `sourceContext.bidCount` is 3 rather than 0: the buyout
  // itself is excluded from the "against N bidders" figure, the three it beat
  // are not. `standingBidAtBuyout` is read from these bids and NOT from
  // `product.currentBid`, because a pending buyout never writes that mirror.
  ...buildLadder({
    productId: "auction-beyblade-burst-spriggan-requiem-bought-out",
    productTitle: "Beyblade Burst B-128 Spriggan Requiem (Ended — Bought Out)",
    startingBid: 2499,
    currentBid: 3100,
    bidderIds: ["user-meera-bey", "user-ananya-collector", "user-rohit-collector"],
    closed: true,
  }).map((b) => ({ ...b, status: "lost" as const, isWinning: false })),
  {
    id: "bid-beyblade-burst-spriggan-requiem-seto-kaiba-20260820-buyout",
    productId: "auction-beyblade-burst-spriggan-requiem-bought-out",
    productTitle: "Beyblade Burst B-128 Spriggan Requiem (Ended — Bought Out)",
    userId: "user-seto-kaiba",
    userName: "Mock User 2",
    bidAmount: 4999,
    status: "won",
    isWinning: true,
    isBuyout: true,
    bidDate: daysAgo(4),
    createdAt: daysAgo(4),
    orderId: "order-1-20260820-buyout",
  },
];

export const bidsSeedData = _rawBidsSeedData.map(withBidDefaults) as BidDocument[];
