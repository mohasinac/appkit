/**
 * enqueueJob — the only way a Vercel API route may start heavy work.
 *
 * Writes a lightweight `jobs/{jobId}` doc and returns immediately. The
 * `onJobCreated` Firestore trigger (a Firebase Function — see
 * `appkit/src/_internal/server/functions/firestore.ts`) picks up the write
 * and does the actual processing, per CLAUDE.md Rule #6 (Vercel Hobby 10s
 * sync-function ceiling).
 *
 * The returned `customToken` carries a `bulkJobId` claim matching the
 * `bulk_events/{jobId}` RTDB security rule
 * (`appkit/firebase/base/database.rules.json`) — the caller signs in with it
 * client-side and subscribes via `useBulkEvent({ rtdbPath: RTDB_PATHS.BULK_EVENTS })`.
 */

import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";
import { jobsRepository } from "../../../repositories";
import { JobStatusValues } from "../schemas/firestore";
import { getAdminAuth, getAdminRealtimeDb } from "../../../providers/db-firebase";
import { RTDB_PATHS } from "../../../providers/db-firebase/rtdb-paths";
import type { JsonValue } from "@mohasinac/appkit";

export interface EnqueueJobInput {
  jobType: string;
  payload: Record<string, JsonValue>;
  requestedBy: string;
}

export interface EnqueueJobResult {
  jobId: string;
  customToken: string;
}

export async function enqueueJob(input: EnqueueJobInput): Promise<EnqueueJobResult> {
  const job = await jobsRepository.create({
    jobType: input.jobType,
    status: JobStatusValues.PENDING,
    payload: input.payload,
    requestedBy: input.requestedBy,
  });

  try {
    await getAdminRealtimeDb()
      .ref(`${RTDB_PATHS.BULK_EVENTS}/${job.id}`)
      .set({ status: "pending", createdAt: Date.now() });
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("enqueueJob: RTDB pending-ping failed (non-fatal)", {
      jobId: job.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const customToken = await getAdminAuth().createCustomToken(`bulk_event_${job.id}`, {
    bulkJobId: job.id,
  });

  return { jobId: job.id, customToken };
}
