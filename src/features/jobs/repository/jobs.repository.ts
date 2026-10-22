/**
 * JobsRepository — thin wrapper over the `jobs` collection.
 *
 * See `appkit/src/features/jobs/schemas/firestore.ts` for the doc shape and
 * the async-job primitive's overall flow.
 */

import type { DocumentReference } from "firebase-admin/firestore";
import { BaseRepository } from "../../../providers/db-firebase";
import {
  JOBS_COLLECTION,
  JOB_FIELDS,
  JobStatusValues,
  type JobDocument,
  type JobResult,
} from "../schemas/firestore";

export class JobsRepository extends BaseRepository<JobDocument> {
  constructor() {
    super(JOBS_COLLECTION);
  }

  markProcessing(id: string): Promise<JobDocument> {
    return this.update(id, {
      status: JobStatusValues.PROCESSING,
      startedAt: new Date(),
    });
  }

  markDone(id: string, result: JobResult): Promise<JobDocument> {
    return this.update(id, {
      status: JobStatusValues.DONE,
      result,
      finishedAt: new Date(),
    });
  }

  markFailed(id: string, error: string): Promise<JobDocument> {
    return this.update(id, {
      status: JobStatusValues.FAILED,
      error,
      finishedAt: new Date(),
    });
  }

  /**
   * Attempts exhausted, or a permanent failure. The dead-letter state
   * (Phase 8).
   *
   * 🛑 Distinct from `markFailed`, which now means "this attempt failed and a
   * retry is scheduled". Before Phase 8 there was only `failed`, and it was
   * terminal with no signal — so a job that gave up looked exactly like a job
   * that had just failed once, and nothing anywhere distinguished them.
   */
  markDead(id: string, error: string): Promise<JobDocument> {
    return this.update(id, {
      status: JobStatusValues.DEAD,
      error,
      finishedAt: new Date(),
    });
  }

  /**
   * Schedule the next attempt as a NEW document (Phase 8).
   *
   * ## 🛑 Why a new document and not a reset of this one
   *
   * `onJobCreated` fires on CREATE. Flipping a job back to `pending` would
   * never wake the trigger, so it would sit `pending` forever looking
   * scheduled — a stall that reads as a queue. A fresh document is what makes
   * the retry visible to the only mechanism that can run it.
   *
   * It also keeps the history: three attempts are three documents, each with
   * its own error, so a repeating failure is legible instead of being
   * overwritten by the last one.
   *
   * `parentJobId` points at the ORIGINAL — `parentJobId ?? id`, so attempt 3
   * is linked to attempt 1 rather than to attempt 2. A flat fan means "every
   * attempt of this job" is one equality query, where a linked list needs N
   * reads to walk.
   */
  async createRetry(
    id: string,
    job: JobDocument,
    next: { attempt: number; maxAttempts: number; nextAttemptAt: Date },
  ): Promise<string> {
    const created = await this.create({
      jobType: job.jobType,
      status: JobStatusValues.PENDING,
      payload: job.payload,
      requestedBy: job.requestedBy,
      attempt: next.attempt,
      maxAttempts: next.maxAttempts,
      nextAttemptAt: next.nextAttemptAt,
      parentJobId: job.parentJobId ?? id,
      lastError: job.error,
    } as Parameters<JobsRepository["create"]>[0]);
    return created.id;
  }

  /**
   * Retries whose `nextAttemptAt` has passed — the sweep's only query.
   *
   * 🛑 `status == pending` AND `nextAttemptAt <= now`, so it can never pick up
   * a FIRST attempt: an original job carries no `nextAttemptAt`, and a
   * Firestore inequality excludes every document that lacks the field. That
   * exclusion is usually the trap (see `.where("isTestData","!=",true)` in
   * CLAUDE.md, and D26's `orderBy` on an optional field); here it is exactly
   * the filter wanted, and it is written down so nobody "fixes" it by adding
   * a default.
   *
   * Bounded at 20 per tick. The sweep rides `paymentWindowTimeout`, which runs
   * every 5 minutes, so that is 240 retries an hour — far above any real
   * backlog, and low enough that a pathological queue cannot exhaust the
   * function's own budget in one pass.
   */
  async getDueRetries(
    limit = 20,
  ): Promise<Array<{ id: string; data: JobDocument }>> {
    const snap = await this.getCollection()
      .where(JOB_FIELDS.STATUS, "==", JobStatusValues.PENDING)
      .where(JOB_FIELDS.NEXT_ATTEMPT_AT, "<=", new Date())
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({
      id: d.id,
      data: { id: d.id, ...d.data() } as JobDocument,
    }));
  }

  /**
   * Refs for finished jobs older than `ttlDays` — used by the
   * `cleanupRtdbEvents` sweep to prune the `jobs` collection.
   *
   * 🛑 `DEAD` is deliberately NOT in this list. A dead job has an open
   * `dead_job` case pointing at it, and the job document holds the payload
   * that would let someone re-run the work by hand — pruning it would leave a
   * case referencing nothing, which is worse than a stale row. They are
   * retained until a human resolves the case and can be pruned by a separate,
   * case-aware sweep if they ever accumulate.
   */
  async getStaleFinishedRefs(ttlDays = 30): Promise<DocumentReference[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ttlDays);
    const snap = await this.getCollection()
      .where(JOB_FIELDS.STATUS, "in", [JobStatusValues.DONE, JobStatusValues.FAILED])
      .where(JOB_FIELDS.UPDATED_AT, "<", cutoff)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }
}

export const jobsRepository = new JobsRepository();
