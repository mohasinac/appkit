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
import { JOB_MAX_ATTEMPTS, JobStatusValues } from "../schemas/firestore";
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
    /*
     * Phase 8 — attempt 1 of N, stated rather than implied.
     *
     * `attempt` defaults to 1 everywhere it is read, so this write is not
     * strictly required — but an explicit 1 is what makes an ENQUEUED job
     * distinguishable from a pre-Phase-8 row at a glance, and it is what a
     * reader of the collection needs when three documents share a
     * `parentJobId`.
     *
     * 🛑 `nextAttemptAt` is deliberately ABSENT. It is the retry sweep's query
     * field, and the create trigger skips any job carrying a future one — so
     * setting it here (even to `now`) would put every first attempt at the
     * mercy of a 5-minute sweep instead of running immediately, turning a
     * synchronous-feeling admin action into one that appears to hang.
     */
    attempt: 1,
    maxAttempts: JOB_MAX_ATTEMPTS,
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
