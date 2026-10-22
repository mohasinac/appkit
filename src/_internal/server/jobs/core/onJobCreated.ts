/**
 * Core: `jobs/{jobId}` document-created trigger.
 *
 * This is the single dispatch point for the async-job primitive
 * (CLAUDE.md Rule #6 — Vercel routes never do heavy work; they write a
 * `jobs` doc and return, this Function does the actual processing).
 *
 * ## 🛑 It no longer runs the job itself — `runJobOnce` does (Phase 8)
 *
 * The attempt, the failure classification and the retry scheduling all live in
 * `runJobOnce`, which the retry sweep also calls. One dispatch path for both
 * entry points, or the two drift the first time either learns something.
 */

import { jobsRepository } from "../../../../repositories";
import type { JobDocument } from "../../../../features/jobs/schemas/firestore";
import type { JobContext } from "../runtime/types";
import { runJobOnce } from "./runJobOnce";

export interface HandleJobCreatedInput {
  jobId: string;
  job: JobDocument;
}

export async function handleJobCreated(
  input: HandleJobCreatedInput,
  ctx: JobContext,
): Promise<void> {
  const { jobId, job } = input;

  /*
   * ── 🛑 A SCHEDULED RETRY MUST NOT RUN HERE ────────────────────────────────
   *
   * This guard is the whole reason Phase 8's backoff works, and its absence
   * was a defect in this feature's own first draft.
   *
   * A retry is a NEW `jobs` document (it has to be — this trigger fires on
   * CREATE, so flipping a job back to `pending` would never wake anything).
   * But creating that document fires THIS trigger immediately — so without
   * this check, every retry would run the instant it was scheduled, the
   * 5-minute and 30-minute backoffs would be zero, and three attempts would
   * burn in under a second against a fault that had not had time to clear.
   * The backoff fields would still be written, so the database would read as
   * though it had waited.
   *
   * `nextAttemptAt` in the future means "the sweep owns this one". Returning
   * leaves the document `pending`, which is exactly what `getDueRetries`
   * queries for.
   */
  if (job.nextAttemptAt) {
    const due = new Date(job.nextAttemptAt).getTime();
    if (Number.isFinite(due) && due > Date.now()) {
      ctx.logger.info("onJobCreated: retry scheduled, deferring to the sweep", {
        jobId,
        jobType: job.jobType,
        attempt: job.attempt ?? 1,
        nextAttemptAt: new Date(due).toISOString(),
      });
      return;
    }
  }

  await runJobOnce({ jobId, job }, ctx);
}

/**
 * The retry sweep — runs every scheduled attempt whose time has come.
 *
 * ## 🛑 Folded into an EXISTING scheduled function, not a new one
 *
 * It is called from `paymentWindowTimeout` (every 5 minutes). Cloud Scheduler
 * bills per registered job and this project already carries ~34 of them
 * against 3 free; adding a 35th to run a usually-empty query is the cost this
 * plan explicitly refuses. The same reasoning put the ledger reconciler inside
 * `dailyDataCleanup` and R1 inside this same function.
 *
 * 🛑 And it is placed FIRST at its call site, before that function's early
 * return — `paymentWindowTimeout` returns as soon as there are no expired
 * payment windows, which is most ticks, so appending would run the sweep only
 * on the minority of ticks with unrelated work (Root Cause #27).
 *
 * Sequential, not `Promise.all`. A job runner is heavy by definition — that is
 * why it is a job — and twenty of them concurrently inside one 540s function
 * is how a sweep exhausts its own budget. Twenty sequential attempts that run
 * out of time simply leave the rest `pending` for the next tick, which is the
 * safe failure.
 */
export async function runDueJobRetries(ctx: JobContext): Promise<{ ran: number }> {
  const due = await jobsRepository.getDueRetries();
  if (due.length === 0) return { ran: 0 };

  ctx.logger.info("job retries: running due attempts", { count: due.length });
  let ran = 0;
  for (const { id, data } of due) {
    /*
     * `runJobOnce` never throws — it records every outcome on the job itself.
     * The `.catch` is belt-and-braces so one pathological job cannot abort the
     * rest of the sweep, which would leave the remainder un-retried with no
     * record of why.
     */
    await runJobOnce({ jobId: id, job: data }, ctx).catch((err: unknown) => {
      ctx.logger.error("job retries: attempt threw", err, { jobId: id });
    });
    ran += 1;
  }
  return { ran };
}
