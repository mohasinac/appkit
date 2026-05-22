/**
 * Firebase runtime adapter for appkit job handlers.
 *
 * Wraps pure handler functions into Firebase Functions v2 triggers so the
 * consumer's `functions/src/index.ts` becomes a thin barrel:
 *
 *   import { handlers } from "./_internal/server/jobs/handlers";
 *   export const auctionSettlement = bindSchedule("auctionSettlement", handlers.auctionSettlement, { schedule: "every 15 minutes" });
 *
 * The adapter resolves a JobContext (db + logger + env) per invocation so the
 * handler stays portable.
 */

import { onSchedule, type ScheduleOptions } from "firebase-functions/v2/scheduler";
import {
  onDocumentWritten,
  onDocumentCreated,
  onDocumentUpdated,
  type DocumentOptions,
} from "firebase-functions/v2/firestore";
import {
  onCall,
  onRequest,
  type CallableOptions,
  type CallableRequest,
  type HttpsOptions,
} from "firebase-functions/v2/https";
// Note: we intentionally pass secret NAMES (as strings) — not `defineSecret`
// Param refs — to `onRequest({ secrets: [...] })`. firebase-functions v2
// accepts both forms; the string form skips the firebase-tools Param-value
// preflight that requires either an interactive prompt or a
// functions/.env.<project> file (which would defeat the purpose of using
// Secret Manager for the value). At runtime the SDK resolves the secret name
// from Cloud Secret Manager directly and injects it into process.env.
import { getAdminDb } from "../../../../../providers/db-firebase";
import { serverLogger } from "../../../../../monitoring";
import type {
  CallableHandler,
  FirestoreTriggerHandler,
  JobContext,
  JobLogger,
  ScheduleHandler,
} from "../types";

function buildContext(job: string): JobContext {
  const logger: JobLogger = {
    info: (msg, meta) => serverLogger.info(`[${job}] ${msg}`, meta),
    warn: (msg, meta) => serverLogger.warn(`[${job}] ${msg}`, meta),
    error: (msg, err, meta) =>
      serverLogger.error(`[${job}] ${msg}`, { err, ...(meta ?? {}) }),
  };
  return {
    job,
    db: getAdminDb(),
    logger,
    env: (key) => process.env[key],
    now: new Date(),
  };
}

export function bindSchedule(
  job: string,
  handler: ScheduleHandler,
  options: ScheduleOptions,
) {
  return onSchedule(options, async () => {
    const ctx = buildContext(job);
    try {
      await handler(ctx);
    } catch (err) {
      ctx.logger.error("Fatal error during scheduled job", err);
      throw err;
    }
  });
}

export function bindDocumentWritten<TBefore = unknown, TAfter = unknown>(
  job: string,
  handler: FirestoreTriggerHandler<TBefore, TAfter>,
  options: DocumentOptions,
) {
  return onDocumentWritten(options, async (event) => {
    const ctx = buildContext(job);
    const before = (event.data?.before?.exists ? (event.data?.before?.data() as TBefore) : null) ?? null;
    const after = (event.data?.after?.exists ? (event.data?.after?.data() as TAfter) : null) ?? null;
    try {
      await handler(
        {
          path: (event.data?.after?.ref ?? event.data?.before?.ref)?.path ?? "",
          params: event.params as Record<string, string>,
          before,
          after,
        },
        ctx,
      );
    } catch (err) {
      ctx.logger.error("Fatal error during document write trigger", err);
      throw err;
    }
  });
}

export function bindDocumentCreated<TAfter = unknown>(
  job: string,
  handler: FirestoreTriggerHandler<null, TAfter>,
  options: DocumentOptions,
) {
  return onDocumentCreated(options, async (event) => {
    const ctx = buildContext(job);
    const after = (event.data?.exists ? (event.data?.data() as TAfter) : null) ?? null;
    try {
      await handler(
        {
          path: event.data?.ref.path ?? "",
          params: event.params as Record<string, string>,
          before: null,
          after,
        },
        ctx,
      );
    } catch (err) {
      ctx.logger.error("Fatal error during document create trigger", err);
      throw err;
    }
  });
}

export function bindDocumentUpdated<TBefore = unknown, TAfter = unknown>(
  job: string,
  handler: FirestoreTriggerHandler<TBefore, TAfter>,
  options: DocumentOptions,
) {
  return onDocumentUpdated(options, async (event) => {
    const ctx = buildContext(job);
    const before = (event.data?.before?.exists ? (event.data?.before?.data() as TBefore) : null) ?? null;
    const after = (event.data?.after?.exists ? (event.data?.after?.data() as TAfter) : null) ?? null;
    try {
      await handler(
        {
          path: event.data?.after?.ref.path ?? event.data?.before?.ref.path ?? "",
          params: event.params as Record<string, string>,
          before,
          after,
        },
        ctx,
      );
    } catch (err) {
      ctx.logger.error("Fatal error during document update trigger", err);
      throw err;
    }
  });
}

export function bindCallable<TInput = unknown, TOutput = unknown>(
  job: string,
  handler: CallableHandler<TInput, TOutput>,
  options: CallableOptions,
) {
  return onCall<TInput, Promise<TOutput>>(options, async (request: CallableRequest<TInput>) => {
    const ctx = buildContext(job);
    try {
      return await handler(request.data, ctx);
    } catch (err) {
      ctx.logger.error("Fatal error during callable", err);
      throw err;
    }
  });
}

export interface BindHttpsOptions extends HttpsOptions {
  /**
   * Env var holding the shared secret. The request's `x-internal-secret`
   * header must equal `process.env[secretEnvVar]` or the request is rejected
   * with 401. Omit (or pass `null`) to disable secret auth — the consumer is
   * then responsible for authenticating the request before the handler runs.
   */
  secretEnvVar?: string | null;
  /** Allowed HTTP methods; defaults to POST only. */
  methods?: string[];
}

/**
 * Bind a pure callable handler to a Firebase HTTPS Cloud Function with
 * shared-secret authentication. Translates JSON body → handler input and
 * handler output → JSON response. Status codes:
 *  - 401 if secret invalid
 *  - 405 if method not allowed
 *  - 400 if handler throws a ValidationError-shaped error
 *  - 500 on any other thrown error
 */
export function bindHttps<TInput = unknown, TOutput = unknown>(
  job: string,
  handler: CallableHandler<TInput, TOutput>,
  options: BindHttpsOptions,
) {
  const { secretEnvVar, methods = ["POST"], ...httpsOptions } = options;

  // Secret is provided via functions/.env.<project> (dotenv) rather than
  // Secret Manager binding. Skip adding to `secrets: [...]` — that requires
  // roles/secretmanager.secretAccessor on the compute SA which isn't granted
  // yet (Q1-iam). The dotenv file injects into process.env before the
  // function runs, so the auth check below still works.

  return onRequest(httpsOptions, async (req, res) => {
    const ctx = buildContext(job);
    if (secretEnvVar) {
      const expected = process.env[secretEnvVar];
      const header = req.headers["x-internal-secret"];
      const provided = Array.isArray(header) ? header[0] : header;
      if (!expected || provided !== expected) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }
    if (!methods.includes(req.method)) {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const output = await handler(req.body as TInput, ctx);
      res.status(200).json(output);
    } catch (err) {
      const status = (err as { httpStatus?: number } | null)?.httpStatus ?? 500;
      ctx.logger.error("HTTPS handler error", err);
      res.status(status).json({ error: err instanceof Error ? err.message : "Internal error" });
    }
  });
}

export const bindToFirebase = {
  schedule: bindSchedule,
  documentWritten: bindDocumentWritten,
  documentCreated: bindDocumentCreated,
  documentUpdated: bindDocumentUpdated,
  callable: bindCallable,
  https: bindHttps,
};
