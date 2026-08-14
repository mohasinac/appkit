/**
 * Core: `jobs/{jobId}` document-created trigger.
 *
 * This is the single dispatch point for the async-job primitive
 * (CLAUDE.md Rule #6 — Vercel routes never do heavy work; they write a
 * `jobs` doc and return, this Function does the actual processing).
 *
 * Flow:
 *   1. Mark the job "processing".
 *   2. Look up a runner in `JOB_RUNNERS` by `job.jobType`.
 *   3. Run it, mark the job "done"/"failed", and best-effort ping the
 *      `bulk_events/{jobId}` RTDB channel the client is subscribed to via
 *      `useBulkEvent` — every RTDB write is its own try/catch so a ping
 *      failure never masks the real Firestore result.
 */

import { normalizeError } from "../../../../errors/normalize";
import { jobsRepository } from "../../../../repositories";
import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import { RTDB_PATHS } from "../../../../providers/db-firebase/rtdb-paths";
import type { JobDocument } from "../../../../features/jobs/schemas/firestore";
import type { JobContext } from "../runtime/types";
import { JOB_RUNNERS } from "./jobRunners";

export interface HandleJobCreatedInput {
  jobId: string;
  job: JobDocument;
}

async function pingBulkEvent(jobId: string, payload: Record<string, unknown>, ctx: JobContext): Promise<void> {
  try {
    await getAdminRealtimeDb()
      .ref(`${RTDB_PATHS.BULK_EVENTS}/${jobId}`)
      .set({ ...payload, updatedAt: Date.now() });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("onJobCreated: RTDB ping failed (non-fatal)", {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function handleJobCreated(
  input: HandleJobCreatedInput,
  ctx: JobContext,
): Promise<void> {
  const { jobId, job } = input;
  await jobsRepository.markProcessing(jobId);

  const runner = JOB_RUNNERS[job.jobType];
  if (!runner) {
    const error = `Unknown jobType: ${job.jobType}`;
    await jobsRepository.markFailed(jobId, error);
    await pingBulkEvent(jobId, { status: "failed", action: job.jobType, error }, ctx);
    ctx.logger.error("onJobCreated: unknown jobType", null, { jobId, jobType: job.jobType });
    return;
  }

  try {
    const result = await runner(job.payload, ctx);
    await jobsRepository.markDone(jobId, result);
    await pingBulkEvent(jobId, { status: "success", action: job.jobType, ...result }, ctx);
    ctx.logger.info("onJobCreated: job complete", { jobId, jobType: job.jobType, summary: result.summary });
  } catch (err) {
    void normalizeError(err);
    const message = err instanceof Error ? err.message : String(err);
    await jobsRepository.markFailed(jobId, message);
    await pingBulkEvent(jobId, { status: "failed", action: job.jobType, error: message }, ctx);
    ctx.logger.error("onJobCreated: job failed", err, { jobId, jobType: job.jobType });
  }
}
