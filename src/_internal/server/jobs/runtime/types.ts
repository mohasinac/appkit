/**
 * Job runtime contracts for appkit-owned handlers.
 *
 * Handlers live in `appkit/src/_internal/server/jobs/handlers/<name>.ts` as
 * pure async functions. A runtime adapter (e.g. `bindToFirebase`) wraps them
 * with provider-specific triggers (Cloud Scheduler, Firestore onWrite, etc.)
 * inside the consumer's `functions/src/index.ts`.
 *
 * The boundaries below intentionally keep the handler ignorant of which
 * provider it runs under. The adapter is responsible for translating
 * Firebase-specific events into JobContext + payloads.
 */

import type { Firestore } from "firebase-admin/firestore";
import type { JsonValue } from "@mohasinac/appkit";

export interface JobLogger {
  info(message: string, meta?: Record<string, JsonValue>): void;
  warn(message: string, meta?: Record<string, JsonValue>): void;
  // audit-unknown-ok: error-handler entry point — accepts thrown values of any shape
  error(message: string, err?: unknown, meta?: Record<string, JsonValue>): void;
}

export interface JobContext {
  /** Stable job/trigger name for log correlation. */
  job: string;
  /** Resolved firebase-admin Firestore instance. */
  db: Firestore;
  /** Logger bound to the job name. */
  logger: JobLogger;
  /** Process env at runtime (lookup function so tests can stub easily). */
  env: (key: string) => string | undefined;
  /** Current UTC time at invocation. */
  now: Date;
}

/** Scheduled job — no payload, returns void. */
export type ScheduleHandler = (ctx: JobContext) => Promise<void>;

/** Firestore document trigger — receives the doc snapshot delta. */
export interface FirestoreTriggerEvent<TBefore = unknown, TAfter = unknown> {
  /** The Firestore document path including segment values. */
  path: string;
  /** Path params extracted from the wildcard pattern. */
  params: Record<string, string>;
  /** Document state before the write (null on create). */
  before: TBefore | null;
  /** Document state after the write (null on delete). */
  after: TAfter | null;
}

export type FirestoreTriggerHandler<TBefore = unknown, TAfter = unknown> = (
  event: FirestoreTriggerEvent<TBefore, TAfter>,
  ctx: JobContext,
) => Promise<void>;

/** Callable / HTTPS handler — opaque input/output. */
export type CallableHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: JobContext,
) => Promise<TOutput>;

/** Bundle of handlers a consumer wires into Firebase (or another runtime). */
export interface JobHandlers {
  schedules?: Record<string, ScheduleHandler>;
  triggers?: Record<string, FirestoreTriggerHandler>;
  callables?: Record<string, CallableHandler>;
}
