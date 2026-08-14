/**
 * JOB_RUNNERS — registry of `jobType` → runner function for the
 * `onJobCreated` Firestore trigger (see `./onJobCreated.ts`).
 *
 * Every runner takes the job's opaque `payload` + a `JobContext` and returns
 * a `JobRunResult` shaped like the client-facing `BulkActionResult` (see
 * `appkit/src/react/hooks/useBulkAction.ts`) so it can be written verbatim to
 * both the `jobs/{jobId}.result` field and the `bulk_events/{jobId}` RTDB
 * ping channel the client subscribes to via `useBulkEvent`.
 */

import type { JobContext } from "../runtime/types";
import { runWeeklyPayoutEligibility } from "./weeklyPayoutEligibility";
import { runHardBanCascade } from "./hardBanCascade";

export interface JobRunResult {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
  succeeded: string[];
  skipped: string[];
  failed: { id: string; reason: string }[];
  data?: Record<string, unknown>;
}

export type JobRunner = (
  payload: Record<string, unknown>,
  ctx: JobContext,
) => Promise<JobRunResult>;

async function runPayoutsWeeklyJob(
  _payload: Record<string, unknown>,
  ctx: JobContext,
): Promise<JobRunResult> {
  const { payoutsCreated, ordersProcessed, payoutIds } = await runWeeklyPayoutEligibility(ctx);
  return {
    summary: {
      total: payoutsCreated,
      succeeded: payoutsCreated,
      skipped: 0,
      failed: 0,
    },
    succeeded: payoutIds,
    skipped: [],
    failed: [],
    data: { payoutsCreated, ordersProcessed },
  };
}

async function runHardBanCascadeJob(
  payload: Record<string, unknown>,
  ctx: JobContext,
): Promise<JobRunResult> {
  const uid = String(payload.uid ?? "");
  const reason = String(payload.reason ?? "");
  const bannedBy = String(payload.bannedBy ?? "");
  return runHardBanCascade({ uid, reason, bannedBy }, ctx);
}

export const JOB_RUNNERS: Record<string, JobRunner> = {
  payoutsWeekly: runPayoutsWeeklyJob,
  hardBanCascade: runHardBanCascadeJob,
};
