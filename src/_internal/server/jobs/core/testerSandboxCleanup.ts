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
export const SANDBOX_COLLECTIONS = ["categories", "stores", "products", "blogPosts", "events", "offers"] as const;
const BID_CHUNK_SIZE = 30; // Firestore `in` query cap

export interface TesterSandboxCleanupOptions {
  /** true = wipe every isTestData:true doc regardless of testDataExpiresAt (manual force-purge). */
  force?: boolean;
}

export async function runTesterSandboxCleanup(
  ctx: JobContext,
  opts: TesterSandboxCleanupOptions = {},
): Promise<void> {
  const cutoff = opts.force ? null : new Date();
  ctx.logger.info(
    opts.force
      ? "Force-purging all tester sandbox test data"
      : "Sweeping expired tester sandbox test data",
  );

  const allRefs: FirebaseFirestore.DocumentReference[] = [];
  let deletedProductIds: string[] = [];

  for (const collection of SANDBOX_COLLECTIONS) {
    const refs = await getTestDataRefs(ctx.db, collection, cutoff);
    allRefs.push(...refs);
    if (collection === "products") {
      deletedProductIds = refs.map((ref) => ref.id);
    }
  }

  // Cascade into bids referencing deleted test products — bids hold only a live
  // productId FK with no denormalized snapshot, so leaving them behind after the
  // product is gone would create meaningless orphaned auction history.
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
