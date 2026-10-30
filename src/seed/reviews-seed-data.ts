/*
 * WHY: Review fixtures. Production has none, so this is empty.
 * WHAT: Empty. The export and its `withReviewSearchTxt` pipeline are kept so
 * `seed/index.ts` and `seed-cli`'s import still resolve. Two generator loops
 * (65 + 14 rows) were removed.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-22 — the second pass, which caught what the
 * first missed. The rows here were GENERATED (a `.push()` loop, a spread of a
 * generator call, or a factory call with a template-literal id), so a static
 * scan of the array literal read `0` while the loader wrote dozens. The only
 * authority on what a load writes is `npx appkit-seed load --dry-run`.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test".
 *
 * EXPORTS:
 *   reviewsSeedData — Array of 65 review documents
 *
 * @tag domain:reviews,products
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

/*
 * 🛑 `ReviewPlain`: these fixtures hold real reviewer names and `seed-cli`
 * encrypts `userName` on write. The document type declares it
 * `Encrypted<string>`, so the document type would be a false claim — and the
 * `as ReviewDocument[]` cast at the bottom was what hid it.
 */
import type { ReviewPlain } from "../features/reviews/schemas/firestore";
import { withReviewSearchTxt } from "./_helpers/search-txt-wrappers";

/*
 * ── 🛑 THE TWO GENERATOR LOOPS WERE REMOVED HERE, 2026-10-22 ───────────────
 *
 * This array was `[]` followed by `for (let i = 0; i < 65; i++)` and
 * `for (let i = 0; i < 14; i++)`, each pushing a review — 79 rows built at
 * module load.
 *
 * 🛑 That shape is why the first prune MISSED this file and why I reported the
 * seed as matching live when it did not. An empty array literal that a loop
 * fills reads as **0** to any static scan — my own `--source-ids` check said
 * exactly that — and as **79** to the loader. The authority on "what would a
 * load write" is `npx appkit-seed load --dry-run`, and nothing else.
 *
 * Live holds ZERO reviews, and the owner's decision is that live is canonical,
 * so the generated corpus goes rather than being narrowed. It referenced
 * `store-beyblade-arena` throughout — a store deleted in the same prune — which
 * is corroboration that none of it was real.
 *
 * 🛑 COST, recorded rather than left to be discovered: every tester case that
 * needed a review to moderate, a rating distribution, a seller reply, or the
 * PAGINATED reviews tab now has no fixture. The second loop existed solely to
 * push one product to 19 reviews so pagination was exercisable; that case can
 * only report "could not test" until fixtures live in a scratch project.
 */
/*
 * 🛑 RE-POPULATED 2026-10-30 as EXPLICIT TEST DATA, with the owner's
 * confirmation for this audit sweep. Deterministic ids, real product/store
 * FKs — no `orderId` linkage (that field is documented optional precisely
 * because pre-existing reviews have none).
 */
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawReviewsSeedData: Partial<ReviewPlain>[] = [
  {
    id: "review-cho-z-achilles-1",
    createdAt: daysAgo(6),
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst B-34 Victory Valkyrie Boost Variable",
    listingType: "standard",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    userId: "user-meera-bey",
    userName: "Meera Blader",
    rating: 5,
    title: "Exactly as described",
    comment: "Arrived sealed and well-packed. Spins true out of the box — matches the photos.",
    status: "approved",
    helpfulCount: 3,
    reportCount: 0,
    verified: true,
  },
  {
    id: "review-valtryek-1",
    createdAt: daysAgo(4),
    productId: "product-beyblade-burst-valtryek-v3-sold-out",
    productTitle: "Beyblade Burst God Valkyrie 6Vortex Reboot (Sold Out)",
    listingType: "standard",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    userId: "user-rohit-collector",
    userName: "Rohit Collector",
    rating: 4,
    title: "Good condition, slightly delayed shipping",
    comment: "Product itself is great, authenticity checked out. Shipping took a couple of days longer than quoted.",
    status: "approved",
    helpfulCount: 1,
    reportCount: 0,
    verified: true,
  },
  {
    id: "review-spryzen-video-demo-1",
    createdAt: daysAgo(3),
    productId: "product-beyblade-burst-spryzen-video-demo",
    productTitle: "Beyblade Burst B-97 Spryzen S2 (Video Demo, Wikimedia)",
    listingType: "standard",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    userId: "user-ananya-collector",
    userName: "Ananya Patel",
    rating: 5,
    title: "Great for beginners",
    comment: "Bought this for my nephew, he loves it. The video demo on the listing was genuinely useful before buying.",
    status: "approved",
    helpfulCount: 2,
    reportCount: 0,
    verified: false,
  },
  {
    id: "review-regalia-genesis-1",
    createdAt: daysAgo(2),
    productId: "product-beyblade-burst-regalia-genesis",
    productTitle: "Beyblade Burst Xeno Xcalibur Magnet Loop",
    listingType: "standard",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    userId: "user-meera-bey",
    userName: "Meera Blader",
    rating: 3,
    title: "Decent but overpriced for what it is",
    comment: "Build quality is fine, just feels like a lot for a magnet-loop reissue. Would wait for a sale next time.",
    status: "approved",
    helpfulCount: 0,
    reportCount: 0,
    verified: true,
  },
  {
    id: "review-xtreme-stadium-1",
    createdAt: daysAgo(1),
    productId: "beyblade-x-xtreme-stadium-bx-10-copy",
    productTitle: "Beyblade X Xtreme Stadium (BX-10) (Copy)",
    listingType: "standard",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    userId: "user-rohit-collector",
    userName: "Rohit Collector",
    rating: 5,
    title: "Pending moderation example",
    comment: "Flagged here deliberately so the admin moderation queue has a real row to approve or reject.",
    status: "pending",
    helpfulCount: 0,
    reportCount: 0,
    verified: true,
  },
];

export const reviewsSeedData = (_rawReviewsSeedData as ReviewPlain[]).map(
  withReviewSearchTxt,
);
