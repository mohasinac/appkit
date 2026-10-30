import type { JobContext } from "../runtime/types";
import { batchDelete, getTestDataRefs } from "../handlers/_helpers";
import { BID_FIELDS } from "../../../../constants/field-names";

/**
 * 🛑 THE definition of "sandbox scope" — six collections, and nothing else.
 *
 * Everything OUTSIDE this list is permanent: neither this job nor anything else
 * reclaims it. That is why `users`, `addresses`, `sessions` and `siteSettings`
 * survive a tester run untouched, and why the tester lifecycle's cascade delete
 * (tester/scripts/lib/collections.mjs) mirrors this list rather than inventing
 * its own — a second definition is how the two silently disagree.
 *
 * Adding a collection here makes it disposable. Do not add one without also
 * adding a seed fixture for it, or a run will delete rows nothing recreates.
 *
 * (This used to be shared with testerSandboxRefresh.ts, which was removed when
 * the tester runner took over fixture state — see scheduled.ts.)
 */
/*
 * 🛑 `offers` was in this list and could only ever match ZERO rows.
 *
 * `OfferDocument` (features/seller/schemas/firestore.ts) does not declare
 * `isTestData` at all, and `getTestDataRefs` queries on exactly that field — so
 * the entry read as coverage and swept nothing. Measured live before removal:
 * 10 offers, 0 carrying the field. Removed rather than given the field, because
 * no offer fixture has ever needed hiding from the public.
 *
 * 🛑 And a wider measurement worth recording, because it changes how to read
 * this job: **zero documents in ANY of the five remaining collections carry
 * `isTestData` either** — 416 categories, 70 products, 20 blogPosts, 12 events,
 * 4 stores, all absent. So this sweep is DORMANT in production, which is
 * correct rather than broken: the only two `isTestData` fixtures the seed ever
 * had were deleted 2026-10-10, and nothing has needed hiding since.
 *
 * 🛑 Do NOT confuse this list with `seedPurpose`. They answer different
 * questions and conflating them hides the catalogue:
 *
 *   isTestData + testDataExpiresAt  -> may the PUBLIC see this row? (this job)
 *   seedPurpose                     -> may a PURGE delete this row?
 *
 * A demo product is `seedPurpose: "test"` and fully visible; a sandbox fixture
 * is both `test` AND `isTestData`. `audit-seed-purpose` R6 now asserts every
 * entry here declares the field, so the `offers` shape cannot return.
 */
/*
 * 🛑 Every schema that declares `isTestData` must appear here, or the field is
 * WRITE-ONLY and the row is never swept — a flag that reads as "this will be
 * cleaned up" and never is.
 *
 * `orders`, `obligations` and `protectionClaims` were added 2026-10-22 after
 * `audit-seed-purpose`'s inverse rule found all three declaring the field with
 * no entry. They are the propagation chain: an order carries the flag, writing
 * an obligation copies it (`orders.repository.ts` → `repo.open({ …isTestData
 * })`), and a claim inherits it in turn — so a test order left three
 * generations of descendants behind that nothing would ever collect.
 */
export const TEST_DATA_COLLECTIONS = [
  "categories",
  "stores",
  "products",
  "blogPosts",
  "events",
  "orders",
  "obligations",
  "protectionClaims",
] as const;
const BID_CHUNK_SIZE = 30; // Firestore `in` query cap

export interface TestDataCleanupOptions {
  /** true = wipe every isTestData:true doc regardless of testDataExpiresAt (manual force-purge). */
  force?: boolean;
}

export async function runTestDataCleanup(
  ctx: JobContext,
  opts: TestDataCleanupOptions = {},
): Promise<void> {
  const cutoff = opts.force ? null : new Date();
  ctx.logger.info(
    opts.force
      ? "Force-purging all tester sandbox test data"
      : "Sweeping expired tester sandbox test data",
  );

  const allRefs: FirebaseFirestore.DocumentReference[] = [];
  let deletedProductIds: string[] = [];

  for (const collection of TEST_DATA_COLLECTIONS) {
    const refs = await getTestDataRefs(ctx.db, collection, cutoff);
    allRefs.push(...refs);
    if (collection === "products") {
      deletedProductIds = refs.map((ref) => ref.id);
    }
  }

  // Cascade into bids referencing deleted test products — bids hold only a live
  // productId FK with no denormalized snapshot, so leaving them behind after the
  // product is gone would create meaningless orphaned collector drop history.
  for (let i = 0; i < deletedProductIds.length; i += BID_CHUNK_SIZE) {
    const chunk = deletedProductIds.slice(i, i + BID_CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const snap = await ctx.db.collection("bids").where(BID_FIELDS.PRODUCT_ID, "in", chunk).get();
    allRefs.push(...snap.docs.map((d) => d.ref));
  }

  if (allRefs.length === 0) {
    ctx.logger.info("No tester sandbox test data to clean up");
    return;
  }

  const deleted = await batchDelete(ctx, allRefs);
  ctx.logger.info("Tester sandbox cleanup complete", { deleted });
}
