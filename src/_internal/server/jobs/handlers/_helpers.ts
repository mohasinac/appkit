/**
 * Shared helpers for job handlers.
 */

import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import { BATCH_LIMIT } from "./messages";
import type { JobContext } from "../runtime/types";

/** Batch-delete document refs, respecting Firestore's 500-write batch limit. */
export async function batchDelete(
  ctx: JobContext,
  refs: FirebaseFirestore.DocumentReference[],
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const slice = refs.slice(i, i + BATCH_LIMIT);
    const batch = ctx.db.batch();
    for (const ref of slice) batch.delete(ref);
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

export { getAdminRealtimeDb };

/**
 * Query docs tagged isTestData:true in a collection. `cutoff: null` returns every
 * tester-sandbox doc regardless of expiry (manual force-purge); a real Date returns
 * only the ones past testDataExpiresAt (the scheduled 7-day sweep).
 *
 * ## 🛑 `isTestData` without `testDataExpiresAt` means PERMANENT, never purge
 *
 * The flag has two uses, and only one of them is a sandbox fixture:
 *
 *   · a fixture — `isTestData: true` PLUS `testDataExpiresAt`. Disposable,
 *     swept on the 7-day cycle. Every doc in `features/tester/seed-data/` is
 *     this shape; the invariant was checked across all six files.
 *   · permanently hidden — `isTestData: true` and NO expiry. Real, permanent
 *     content that simply must not reach the public or the sitemap.
 *     `store-tester-qa-seller` is the case that forced this distinction.
 *
 * The scheduled path already separates them: `testDataExpiresAt <= cutoff`
 * excludes docs lacking the field. The FORCE path did not — `cutoff: null`
 * drops that clause and returned everything, so `tester:purge-sandbox --force`
 * would have deleted a permanent seed store. Hence the filter below.
 *
 * Filtered in memory rather than as a query clause: a Firestore inequality on
 * `testDataExpiresAt` would exclude every doc missing it, which is the trap
 * documented in CLAUDE.md's anti-pattern table — correct here by luck, wrong
 * the moment someone reuses the shape. In-memory keeps the intent legible, and
 * the read is already bounded at 200.
 */
export async function getTestDataRefs(
  db: FirebaseFirestore.Firestore,
  collection: string,
  cutoff: Date | null,
): Promise<FirebaseFirestore.DocumentReference[]> {
  let q: FirebaseFirestore.Query = db
    .collection(collection)
    .where(PRODUCT_FIELDS.IS_TEST_DATA, "==", true);
  if (cutoff) q = q.where("testDataExpiresAt", "<=", cutoff);
  const snap = await q.limit(200).get();
  return snap.docs
    .filter((d) => cutoff !== null || d.get("testDataExpiresAt") != null)
    .map((d) => d.ref);
}
