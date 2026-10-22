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

/*
 * 🛑 EMPTIED 2026-10-22. Live holds no bids.
 *
 * This literal was NOT a list of rows — it was a list of `...buildLadder({…})`
 * SPREADS, each expanding one auction into a ladder of three to five bids,
 * for 34 in total.
 *
 * That is the third generative shape the first prune could not see, and the
 * one that fooled the static check most completely: `--source-ids` looks for
 * `id:` on top-level array elements, and a spread of a function call has no
 * `id` to find. It reported ONE row (the single hand-written literal) against
 * the loader's 34.
 *
 * 🛑 `buildLadder` and `BIDDER_NAMES` GO TOO, and this comment originally said
 * the opposite — that they were "kept, ready for the day auction fixtures are
 * wanted in a scratch project". Caught before committing: with no caller they
 * are dead code that fails the unused-vars rule, and keeping a generator for a
 * future that may not come is the speculative-infra pattern this project has a
 * standing rule against. They are one `git show` away if ever wanted, and the
 * ladder's real merit — deriving every amount, status and date from its inputs
 * with no `Math.random()` (Root Cause #25) — is recorded here rather than in
 * an unreferenced function.
 */
const _rawBidsSeedData: Partial<BidPlain>[] = [];

export const bidsSeedData = _rawBidsSeedData.map(withBidDefaults) as BidPlain[];
