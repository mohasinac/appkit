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
  /**
   * Phase 8 — attempts exhausted. The dead-letter state.
   *
   * 🛑 `failed` and `dead` are DIFFERENT facts and conflating them is what
   * made a failed job terminal with no signal. `failed` now means "this
   * attempt failed, and a retry is scheduled or the failure was permanent";
   * `dead` means "we have stopped trying" and is the only one that opens a
   * case.
   *
   * A reader that treats every non-`done` as hopeless loses that distinction —
   * which is why the retention sweep excludes `dead` while an open case
   * references it: the row is the evidence.
   */
  DEAD: "dead",
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

  // ── Retry / dead-letter (Phase 8) ──────────────────────────────────────────
  /**
   * 1-based. Absent means 1 — every job written before this field is a first
   * attempt, which is both true and what every reader should assume.
   */
  attempt?: number;
  /** Defaults to `JOB_MAX_ATTEMPTS`; a jobType may lower it. */
  maxAttempts?: number;
  /**
   * When a retry becomes eligible.
   *
   * 🛑 A retry is a **NEW DOCUMENT**, not a mutation of this one, because
   * `onJobCreated` fires on CREATE — re-running a job by flipping its status
   * back to `pending` would never wake the trigger, and the job would sit
   * `pending` forever looking scheduled. So this field lives on the NEW
   * document and a sweep is what moves it from scheduled to running.
   */
  nextAttemptAt?: Date;
  /**
   * The document this is a retry OF — present on every attempt after the
   * first, and absent on the original.
   *
   * 🛑 Points at the ORIGINAL, not at the immediately previous attempt. A
   * flat chain means "show me every attempt of this job" is one equality
   * query, where a linked list would need N reads to walk; and the question
   * anyone actually asks is "did this job eventually work", which is about the
   * original.
   */
  parentJobId?: string;
  /** Why this attempt failed, kept per attempt so a pattern is visible. */
  lastError?: string;
}

/**
 * Attempts before a job is declared dead.
 *
 * Three, with `JOB_BACKOFF_MS` below: a transient fault usually clears in
 * minutes, and a fourth attempt an hour later is far more likely to be the
 * same permanent fault again than a different outcome.
 */
export const JOB_MAX_ATTEMPTS = 3;

/**
 * Delay before attempt 2 and attempt 3.
 *
 * 🛑 Indexed by `attempt - 1`, so the array length must be at least
 * `JOB_MAX_ATTEMPTS - 1`. The last value is reused if it is shorter, rather
 * than producing `undefined` — a `nextAttemptAt` of `Invalid Date` would make
 * the sweep's `<= now` comparison false forever and the retry would never run,
 * which is the silent-stall shape this whole phase exists to remove.
 */
export const JOB_BACKOFF_MS = [5 * 60 * 1000, 30 * 60 * 1000] as const;

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
  // Phase 8 retry/DLQ. `NEXT_ATTEMPT_AT` is the sweep's query field.
  ATTEMPT: "attempt",
  MAX_ATTEMPTS: "maxAttempts",
  NEXT_ATTEMPT_AT: "nextAttemptAt",
  PARENT_JOB_ID: "parentJobId",
  STATUS_VALUES: JobStatusValues,
} as const;
