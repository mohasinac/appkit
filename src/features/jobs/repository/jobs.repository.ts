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
   * Refs for finished (done/failed) jobs older than `ttlDays` — used by the
   * `cleanupRtdbEvents` sweep to prune the `jobs` collection.
   */
  async getStaleFinishedRefs(ttlDays = 30): Promise<DocumentReference[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ttlDays);
    const snap = await this.getCollection()
      .where("status", "in", [JobStatusValues.DONE, JobStatusValues.FAILED])
      .where("updatedAt", "<", cutoff)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }
}

export const jobsRepository = new JobsRepository();
