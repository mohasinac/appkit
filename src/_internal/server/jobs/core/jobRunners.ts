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
import { runWhatsAppNotify, type WhatsAppNotifyPayload } from "./whatsappNotify";
import { runNewsletterExport } from "./newsletterExport";
import { runWhatsAppCatalogImport } from "./whatsappCatalogImport";
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

async function runWhatsAppNotifyJob(
  payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  return runWhatsAppNotify(payload as unknown as WhatsAppNotifyPayload, ctx);
}

async function runNewsletterExportJob(
  _payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  return runNewsletterExport(ctx);
}

async function runWhatsAppCatalogImportJob(
  payload: Record<string, JsonValue>,
  ctx: JobContext,
): Promise<JobRunResult> {
  return runWhatsAppCatalogImport(
    { storeSlug: String(payload.storeSlug ?? "") },
    ctx,
  );
}

export const JOB_RUNNERS: Record<string, JobRunner> = {
  payoutsWeekly: runPayoutsWeeklyJob,
  hardBanCascade: runHardBanCascadeJob,
  resetOtpVerification: runResetOtpVerificationJob,
  whatsappNotify: runWhatsAppNotifyJob,
  newsletterExport: runNewsletterExportJob,
  whatsappCatalogImport: runWhatsAppCatalogImportJob,
};
