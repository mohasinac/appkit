/*
 * WHY: Auction bid fixtures. Production has none, so this is empty.
 * WHAT: Empty. The export and its `withBidDefaults` pipeline are kept so
 * `seed/index.ts` and `seed-cli`'s import still resolve.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
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

/*
 * `BidPlain`: these fixtures hold real plaintext and `seed-cli` encrypts
 * `userEmail` on write, so the document type would claim they are ciphertext.
 */
import type { BidPlain } from "../features/auctions/schemas/firestore";
import { buildBidSearchTxt } from "../utils/search-txt-builders";

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
 * Typed on the PLAIN shape, not `FirestoreDocument`. Once `BidDocument` gained
 * `statusHistory?: StatusChangeEntry[]`, `Partial<BidDocument>` stopped being
 * assignable to `FirestoreDocument` — an array of objects does not satisfy
 * that index signature. The right fix is to narrow the parameter to what the
 * caller actually passes rather than widen the document to keep a helper
 * happy.
 */
function withBidDefaults(b: Partial<BidPlain>): Partial<BidPlain> {
  return {
    ...b,
    productTitle: b.productTitle as string ?? (b.productId as string ?? "").replace(/^auction-/, "").replace(/-/g, " "),
    userEmail: b.userEmail as string ?? BIDDER_EMAILS[b.userId as string] ?? "",
    currency: "INR",
    isWinning: b.status === "active" || b.status === "won",
    updatedAt: (b.createdAt ?? NOW) as Date,
    /*
     * 🛑 DERIVED here, from the same builder the repository's write hook uses —
     * never a hand-written token list.
     *
     * A seeded row without this is invisible to search forever:
     * `array-contains` cannot match a field the document does not have, and it
     * raises nothing (Root Cause #101's shape). Deriving it from
     * `buildBidSearchTxt` is also what keeps the seed and every runtime write
     * agreeing on the normalisation — two token lists built two ways is the
     * mirror-drift trap (Root Cause #42).
     *
     * Applied INSIDE `withBidDefaults` on purpose, after `productTitle` is
     * defaulted above: a derivation placed before it would index the empty
     * string for every row that relies on the fallback.
     */
    searchTxt: buildBidSearchTxt({
      productTitle:
        (b.productTitle as string) ??
        ((b.productId as string) ?? "").replace(/^auction-/, "").replace(/-/g, " "),
      userName: b.userName as string | undefined,
    }),
  } as Partial<BidPlain>;
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
}): Partial<BidPlain>[] {
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

const _rawBidsSeedData: Partial<BidPlain>[] = [
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
  // real BidPlain (`isBuyout: true`) — it is not a bid-free purchase, which
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
  }).map((b) => ({ ...b, status: "lost" as const, isWinning: false })),];

export const bidsSeedData = _rawBidsSeedData.map(withBidDefaults) as BidPlain[];
