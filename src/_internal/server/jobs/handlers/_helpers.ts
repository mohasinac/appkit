/**
 * Shared helpers for job handlers.
 */

import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
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
