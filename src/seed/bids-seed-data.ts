/*
 * WHY: Collector Drop bid fixtures. Production has none, so this is empty.
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
 *   bidsSeedData — Array of bid documents, one set per seeded collector drop, counts matching
 *                  each collector drop's bidCount field
 *
 * @tag domain:collector drops,bids
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
import type { BidPlain } from "../features/collector-drops/schemas/firestore";
import { buildBidSearchTxt } from "../utils/search-txt-builders";

const NOW = new Date();

const BIDDER_EMAILS: Record<string, string> = {
  "user-meera-bey": "meera.blader@gmail.com",
  "user-rohit-collector": "rohit.collect@gmail.com",
  "user-ananya-collector": "ananya.patel@gmail.com",
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
    productTitle: b.productTitle as string ?? (b.productId as string ?? "").replace(/^collectordrop-/, "").replace(/-/g, " "),
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
        ((b.productId as string) ?? "").replace(/^collectordrop-/, "").replace(/-/g, " "),
      userName: b.userName as string | undefined,
    }),
  } as Partial<BidPlain>;
}

/*
 * 🛑 RE-POPULATED 2026-10-30 as EXPLICIT TEST DATA, with the owner's
 * confirmation — reverses the 2026-10-22 prune for this specific audit
 * sweep's need to exercise bid/order/review flows end to end locally. Every
 * id is deterministic (derived from the product id, never `Math.random()` —
 * Root Cause #25) and FKs point at real seeded collector drop products, whose
 * `bidCount`/`currentBid` fields these ladders are built to match, so the
 * denormalized counters on the product docs and this collection agree.
 */
const BIDDERS = ["user-meera-bey", "user-rohit-collector", "user-ananya-collector"];
const BIDDER_NAMES: Record<string, string> = {
  "user-meera-bey": "Meera Blader",
  "user-rohit-collector": "Rohit Collector",
  "user-ananya-collector": "Ananya Patel",
};

function buildLadder(
  productId: string,
  productTitle: string,
  startPrice: number,
  finalBid: number,
  count: number,
  winningStatus: "active" | "won",
): Partial<BidPlain>[] {
  const step = (finalBid - startPrice) / count;
  const now = new Date();
  const rows: Partial<BidPlain>[] = [];
  for (let i = 0; i < count; i += 1) {
    const amount = Math.round(startPrice + step * (i + 1));
    const bidder = BIDDERS[i % BIDDERS.length];
    const isLast = i === count - 1;
    rows.push({
      id: `bid-${productId}-${i + 1}`,
      productId,
      productTitle,
      userId: bidder,
      userName: BIDDER_NAMES[bidder],
      bidAmount: amount,
      status: isLast ? winningStatus : "outbid",
      bidDate: new Date(now.getTime() - (count - i) * 3_600_000),
    });
  }
  return rows;
}

const _rawBidsSeedData: Partial<BidPlain>[] = [
  ...buildLadder(
    "collectordrop-beyblade-burst-cho-z-achilles",
    "Beyblade Burst B-100 Cho-Z Achilles",
    1199,
    1650,
    2,
    "active",
  ),
  ...buildLadder(
    "collectordrop-beyblade-burst-spriggan-requiem-bought-out",
    "Beyblade Burst B-128 Spriggan Requiem (Ended — Bought Out)",
    2499,
    3100,
    4,
    "won",
  ),
  ...buildLadder(
    "collectordrop-beyblade-burst-xcalius-passed-bin",
    "Beyblade Burst Xcalius X2 (bidding passed Buy It Now)",
    700,
    1650,
    7,
    "active",
  ),
  ...buildLadder(
    "collectordrop-beyblade-metal-diablo-nemesis",
    "Metal Fight Beyblade BB-122 Diablo Nemesis (Ended — Sold)",
    3499,
    6200,
    6,
    "won",
  ),
];

export const bidsSeedData = _rawBidsSeedData.map(withBidDefaults) as BidPlain[];
