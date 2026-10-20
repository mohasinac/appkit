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
import { runResetOtpVerification } from "./resetOtpVerification";
import { runNewsletterExport } from "./newsletterExport";
import { runStoreNameBackfill } from "./storeNameBackfill";
import { runCategoryTaxonomyBackfill } from "./categoryTaxonomyBackfill";
import type { JsonValue } from "@mohasinac/appkit";

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
  data?: Record<string, JsonValue>;
}

export type JobRunner = (
  payload: Record<string, JsonValue>,
  ctx: JobContext,
) => Promise<JobRunResult>;

async function runPayoutsWeeklyJob(
  _payload: Record<string, JsonValue>,
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
  payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  const uid = String(payload.uid ?? "");
  const reason = String(payload.reason ?? "");
  const bannedBy = String(payload.bannedBy ?? "");
  const expiresAt = typeof payload.expiresAt === "string" ? new Date(payload.expiresAt) : undefined;
  const fraudOrderId = typeof payload.fraudOrderId === "string" ? payload.fraudOrderId : undefined;
  return runHardBanCascade({ uid, reason, bannedBy, expiresAt, fraudOrderId }, ctx);
}

async function runResetOtpVerificationJob(
  _payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  return runResetOtpVerification(ctx);
}

async function runNewsletterExportJob(
  _payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  return runNewsletterExport(ctx);
}

async function runStoreNameBackfillJob(
  payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  return runStoreNameBackfill({ storeId: String(payload.storeId ?? "") }, ctx);
}

async function runCategoryTaxonomyBackfillJob(
  payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  /*
   * `kind` is narrowed here rather than cast. An unrecognised value falls to
   * "reparent", which is the SAFE default: it re-derives the product closure
   * and skips the subtree ancestor refresh. The reverse default would run a
   * subtree-wide write for a move that changed no name.
   */
  const kind = payload.kind === "rename" ? "rename" : "reparent";
  return runCategoryTaxonomyBackfill(
    { categoryId: String(payload.categoryId ?? ""), kind },
    ctx,
  );
}

export const JOB_RUNNERS: Record<string, JobRunner> = {
  payoutsWeekly: runPayoutsWeeklyJob,
  hardBanCascade: runHardBanCascadeJob,
  resetOtpVerification: runResetOtpVerificationJob,
  newsletterExport: runNewsletterExportJob,
  storeNameBackfill: runStoreNameBackfillJob,
  categoryTaxonomyBackfill: runCategoryTaxonomyBackfillJob,
};
