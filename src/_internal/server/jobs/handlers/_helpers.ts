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
  return snap.docs.map((d) => d.ref);
}
