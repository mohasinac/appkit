/**
 * Run ONE attempt of a job, and decide what happens next (Phase 8).
 *
 * ## 🛑 ONE dispatch path, shared by the trigger and the retry sweep
 *
 * `handleJobCreated` is the `jobs/{jobId}` create trigger; `runDueJobRetries`
 * is the sweep that picks up scheduled retries. Both call THIS, so there is
 * exactly one place that knows how to run a job, classify its failure and
 * schedule the next attempt. Two dispatch paths would drift the first time one
 * of them learned something — which is the shape of every defect in this
 * plan's § "Recurrent Root Cause Patterns" that begins "a fix applied to the
 * route but never back-ported".
 *
 * ## 🛑 A retry is a NEW DOCUMENT
 *
 * `onJobCreated` fires on CREATE. Re-running a job by flipping its status back
 * to `pending` would never wake the trigger, so the job would sit `pending`
 * forever looking scheduled — a stall that reads as "queued". So a retry is a
 * fresh `jobs` document carrying `attempt + 1`, `parentJobId` and a
 * `nextAttemptAt`, and the sweep is what runs it when due.
 *
 * ## What is retryable
 *
 * `mapToHttpError(err).status >= 500`. Reused rather than invented: that
 * function already encodes "is this our fault or the caller's" for every error
 * class in the codebase, and a second classification would answer differently
 * the first time either changed.
 *
 * A 4xx is terminal IMMEDIATELY — no backoff, no attempts burned. A validation
 * failure does not become valid by waiting, and retrying it three times over
 * 35 minutes just delays the case by 35 minutes.
 */

import { normalizeError } from "../../../../errors/normalize";
import { mapToHttpError } from "../../../../errors/error-mapping";
import { jobsRepository } from "../../../../features/jobs/repository/jobs.repository";
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import { RTDB_PATHS } from "../../../../providers/db-firebase/rtdb-paths";
import {
  JOB_BACKOFF_MS,
  JOB_MAX_ATTEMPTS,
  type JobDocument,
} from "../../../../features/jobs/schemas/firestore";
import type { JobContext } from "../runtime/types";
import { JOB_RUNNERS } from "./jobRunners";
import type { JsonValue } from "@mohasinac/appkit";

export interface RunJobOnceInput {
  jobId: string;
  job: JobDocument;
}

async function pingBulkEvent(
  jobId: string,
  payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<void> {
  try {
    await getAdminRealtimeDb()
      .ref(`${RTDB_PATHS.BULK_EVENTS}/${jobId}`)
      .set({ ...payload, updatedAt: Date.now() });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("runJobOnce: RTDB ping failed (non-fatal)", {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * The delay before the next attempt.
 *
 * 🛑 Clamped to the LAST element rather than indexing past the end. An
 * out-of-range index yields `undefined`, `new Date(Date.now() + undefined)` is
 * `Invalid Date`, and the sweep's `nextAttemptAt <= now` comparison is false
 * for an invalid date forever — so the retry would be scheduled and never run.
 * A stall that looks like a queue is the exact failure this phase removes.
 */
function backoffFor(attempt: number): number {
  const idx = Math.max(0, Math.min(attempt - 1, JOB_BACKOFF_MS.length - 1));
  return JOB_BACKOFF_MS[idx];
}

/**
 * Run one attempt. Marks the job done, schedules a retry, or declares it dead.
 *
 * Never throws: a job's failure is recorded on the job, and letting it escape
 * would make the Firebase trigger retry the whole handler — a second,
 * uncontrolled retry mechanism layered under this one, which is precisely the
 * doubling that cost 55 sessions in Root Cause #91 (`run.mjs`'s internal retry
 * multiplying the pool's).
 */
export async function runJobOnce(
  input: RunJobOnceInput,
  ctx: JobContext,
): Promise<void> {
  const { jobId, job } = input;
  const attempt = job.attempt ?? 1;
  const maxAttempts = job.maxAttempts ?? JOB_MAX_ATTEMPTS;

  await jobsRepository.markProcessing(jobId);

  const runner = JOB_RUNNERS[job.jobType];
  if (!runner) {
    /*
     * 🛑 Terminal immediately, and DEAD rather than failed. An unregistered
     * jobType cannot become registered by waiting, and the thing that would
     * fix it is a deploy — so this is the clearest possible case for a human,
     * not a retry. It is also the failure mode of the seed-loader registry
     * (Root Cause #90): a missing map entry whose symptom is silence.
     */
    const error = `No runner registered for jobType: ${job.jobType}`;
    await jobsRepository.markDead(jobId, error);
    await pingBulkEvent(jobId, { status: "failed", action: job.jobType, error }, ctx);
    await openDeadJobCase(jobId, job, error, ctx);
    ctx.logger.error("runJobOnce: unregistered jobType", null, { jobId, jobType: job.jobType });
    return;
  }

  try {
    const result = await runner(job.payload, ctx);
    await jobsRepository.markDone(jobId, result);
    await pingBulkEvent(jobId, { status: "success", action: job.jobType, ...result }, ctx);
    ctx.logger.info("runJobOnce: job complete", {
      jobId,
      jobType: job.jobType,
      attempt,
      summary: result.summary,
    });
    return;
  } catch (err) {
    void normalizeError(err);
    const message = err instanceof Error ? err.message : String(err);
    /*
     * 🛑 `mapToHttpError` rather than a bespoke test. It already decides "ours
     * or theirs" for every error class here, so a 5xx is a transient fault
     * worth retrying and a 4xx is a permanent one that will fail identically
     * in five minutes.
     */
    const status = mapToHttpError(err).status;
    const retryable = status >= 500;
    const attemptsLeft = attempt < maxAttempts;

    if (retryable && attemptsLeft) {
      const nextAttemptAt = new Date(Date.now() + backoffFor(attempt));
      /*
       * 🛑 The NEW document is created BEFORE this one is marked failed. The
       * reverse ordering leaves a window where the job reads as failed with no
       * retry scheduled — and if the process dies in that window, nothing
       * retries and nothing says so. This way the worst case is a scheduled
       * retry whose parent still reads `processing`, which the sweep handles
       * and a human can see.
       */
      const retryId = await jobsRepository.createRetry(jobId, job, {
        attempt: attempt + 1,
        maxAttempts,
        nextAttemptAt,
      });
      await jobsRepository.markFailed(jobId, message);
      /*
       * The client is told "retrying", not "failed". `useBulkEvent` watches
       * for a terminal state, and reporting failure here would stop a progress
       * UI on a job that is still going.
       */
      await pingBulkEvent(
        jobId,
        { status: "retrying", action: job.jobType, error: message, retryJobId: retryId },
        ctx,
      );
      ctx.logger.warn("runJobOnce: attempt failed, retry scheduled", {
        jobId,
        retryId,
        jobType: job.jobType,
        attempt,
        status,
        nextAttemptAt: nextAttemptAt.toISOString(),
      });
      return;
    }

    await jobsRepository.markDead(jobId, message);
    await pingBulkEvent(jobId, { status: "failed", action: job.jobType, error: message }, ctx);
    await openDeadJobCase(jobId, job, message, ctx);
    ctx.logger.error("runJobOnce: job DEAD", err, {
      jobId,
      jobType: job.jobType,
      attempt,
      status,
      reason: retryable ? "attempts exhausted" : "permanent failure",
    });
  }
}

/**
 * A dead job is a case, not a log line.
 *
 * 🛑 Keyed on the ORIGINAL job id (`parentJobId ?? jobId`), so three exhausted
 * attempts of one job produce ONE case rather than three. `openOrObserve`
 * increments its own counter — the property that makes it safe to open a case
 * from a hot path at all.
 *
 * Best-effort: a job is already dead by this point, and failing to file the
 * case must not turn that into a thrown error from a trigger.
 */
async function openDeadJobCase(
  jobId: string,
  job: JobDocument,
  error: string,
  ctx: JobContext,
): Promise<void> {
  const subjectId = job.parentJobId ?? jobId;
  try {
    await paymentCasesRepository().openOrObserve({
      kind: "dead_job",
      subjectId,
      severity: "error",
      entityType: "job",
      entityId: subjectId,
      title: `Job ${job.jobType} gave up after ${job.attempt ?? 1} attempt(s)`,
      detail:
        `The last error was: ${error}. ` +
        `Requested by ${job.requestedBy}. The job document holds the payload.`,
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("runJobOnce: could not open dead_job case", err, { jobId });
  }
}
