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
const _rawReviewsSeedData: Partial<ReviewPlain>[] = [];

export const reviewsSeedData = (_rawReviewsSeedData as ReviewPlain[]).map(
  withReviewSearchTxt,
);
