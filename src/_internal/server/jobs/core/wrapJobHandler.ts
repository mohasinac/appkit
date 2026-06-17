/**
 * wrapJobHandler — turn any pure job handler into one whose exceptions are
 * persisted to `serverErrors` (source: "function") before being re-thrown so
 * the runtime's retry semantics are preserved.
 *
 * Apply to every handler in the consumer's runtime adapter so the maintenance
 * UI sees a row for every Cloud Function failure.
 */

import { mapToHttpError } from "../../../../errors/error-mapping";
import { serverErrorsRepository } from "../../../../features/server-errors/repository/server-errors.repository";
import type {
  CallableHandler,
  FirestoreTriggerHandler,
  ScheduleHandler,
  JobContext,
} from "../runtime/types";

interface WrapOptions {
  /** Function/handler name — used as the route field on serverErrors rows. */
  name: string;
  /** Optional payload-size cap when stringifying the input as bodyDigest seed. */
  payloadMaxBytes?: number;
}

// audit-unknown-ok: error-handler entry point — accepts thrown values of any shape
async function persist(name: string, err: unknown, ctxLike?: { now?: Date }): Promise<void> {
  const mapped = mapToHttpError(err);
  try {
    await serverErrorsRepository().record({
      source: "function",
      route: name,
      code: mapped.code,
      message: mapped.message,
      stack: err instanceof Error ? err.stack : undefined,
      requestId: `fn-${name}-${(ctxLike?.now ?? new Date()).getTime()}`,
      occurredAt: (ctxLike?.now ?? new Date()).getTime(),
    });
  } catch {
    /* logging-the-logging-failure is forbidden */
  }
}

export function wrapScheduleHandler(
  name: string,
  handler: ScheduleHandler,
): ScheduleHandler {
  return async (ctx: JobContext) => {
    try {
      return await handler(ctx);
    } catch (err) {
      await persist(name, err, ctx);
      throw err;
    }
  };
}

export function wrapTriggerHandler<TBefore = unknown, TAfter = unknown>(
  name: string,
  handler: FirestoreTriggerHandler<TBefore, TAfter>,
): FirestoreTriggerHandler<TBefore, TAfter> {
  return async (event, ctx) => {
    try {
      return await handler(event, ctx);
    } catch (err) {
      await persist(name, err, ctx);
      throw err;
    }
  };
}

export function wrapCallableHandler<TInput = unknown, TOutput = unknown>(
  name: string,
  handler: CallableHandler<TInput, TOutput>,
): CallableHandler<TInput, TOutput> {
  return async (input, ctx) => {
    try {
      return await handler(input, ctx);
    } catch (err) {
      await persist(name, err, ctx);
      throw err;
    }
  };
}

/**
 * Generic wrap-by-name helper. The kind is inferred from the handler arity.
 * Use this only when bundling JobHandlers — prefer the typed wrappers above
 * in adapter code.
 */
export function wrapJobHandler<F extends (...args: never[]) => Promise<unknown>>(
  name: string,
  handler: F,
): F {
  return (async (...args: Parameters<F>) => {
    try {
      return await handler(...args);
    } catch (err) {
      // Best-effort: pull the last arg as JobContext if it has a `.now`
      const maybeCtx = args[args.length - 1] as { now?: Date } | undefined;
      await persist(name, err, maybeCtx);
      throw err;
    }
  }) as F;
}

export type { WrapOptions };
