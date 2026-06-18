import { serverLogger } from "../monitoring";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../errors";
import type { ActionResult } from "../core/server-action";

export type { ActionResult };

type ActionErrorResult = Extract<ActionResult<never>, { ok: false }>;

export function handleActionError(err: unknown): ActionErrorResult {
  const devDebug =
    process.env.NODE_ENV === "development"
      ? { stack: err instanceof Error ? err.stack : String(err) }
      : undefined;

  if (err instanceof NotFoundError)
    return { ok: false, error: err.message, code: "NOT_FOUND", ...(devDebug && { debug: devDebug }) };
  if (err instanceof ValidationError) {
    const code = (err.data as { code?: string } | undefined)?.code ?? "VALIDATION";
    return { ok: false, error: err.message, code, ...(devDebug && { debug: devDebug }) };
  }
  if (err instanceof AuthorizationError)
    return { ok: false, error: err.message, code: "UNAUTHORIZED", ...(devDebug && { debug: devDebug }) };

  serverLogger.error("Unexpected action error", { err });
  return {
    ok: false,
    error: "Something went wrong. Please try again.",
    code: "INTERNAL",
    ...(devDebug && { debug: devDebug }),
  };
}
