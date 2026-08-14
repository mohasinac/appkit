/**
 * Async Job Firestore Document Types & Constants
 *
 * Collection: jobs
 * Document ID: Firestore auto-ID (no slug prefix — see CLAUDE.md "True
 * Firestore auto-IDs" list).
 *
 * A `jobs/{jobId}` document is a lightweight trigger record. Vercel API
 * routes write ONE of these and return immediately (`{ jobId, customToken }`).
 * All actual processing happens inside the `onJobCreated` Firebase Function,
 * which reads `jobType` to pick a runner from `JOB_RUNNERS`, executes it, and
 * writes the final status back to both this document and the
 * `bulk_events/{jobId}` RTDB ping channel the client is subscribed to.
 *
 * This is the async-job primitive for any admin action that would otherwise
 * exceed the Vercel Hobby 10s sync-function ceiling (CLAUDE.md Rule #6).
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { JsonValue } from "@mohasinac/appkit";

export const JOBS_COLLECTION = "jobs";

export const JobStatusValues = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
} as const;

export type JobStatus = (typeof JobStatusValues)[keyof typeof JobStatusValues];

export interface JobResult {
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

export interface JobDocument extends BaseDocument {
  /** Key into JOB_RUNNERS — e.g. "payoutsWeekly", "hardBanCascade". */
  jobType: string;
  status: JobStatus;
  /** Opaque input the runner receives — shape is jobType-specific. */
  payload: Record<string, JsonValue>;
  /** uid of the admin/user who enqueued this job. */
  requestedBy: string;
  result?: JobResult;
  error?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

export const JOB_FIELDS = {
  JOB_TYPE: "jobType",
  STATUS: "status",
  PAYLOAD: "payload",
  REQUESTED_BY: "requestedBy",
  ERROR: "error",
  STARTED_AT: "startedAt",
  FINISHED_AT: "finishedAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  STATUS_VALUES: JobStatusValues,
} as const;
