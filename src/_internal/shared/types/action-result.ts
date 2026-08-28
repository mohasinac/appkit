import { normalizeError } from "../../../errors/normalize";
import { mapToHttpError } from "../../../errors/error-mapping";
import { describeCauseChain } from "../../../errors/describe-cause";
import { reportActionError } from "./action-error-reporter";
// Deliberately NO serverLogger import here. This module also exports isOk /
// unwrap, which client components import, and server-logger.ts does
// `require("fs")` / `require("path")` in its file-logging path — statically
// analysable, so pulling it in would put Node builtins in a client chunk
// (CLAUDE.md Root Cause #6). Both the console line and the serverErrors write
// happen inside the injected reporter, which is server-only by construction.

/**
 * Uniform envelope shape — emitted by every HTTP route, every server action,
 * and consumed by the client ApiClient. Discriminated by `ok`.
 *
 * Mirrors the response shape of `createRouteHandler` so server actions and
 * routes can be migrated through the same client surface (useApiMutation).
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      /** Stable error code from ERROR_DISPLAY_MAP. Optional for compat with the legacy core/server-action envelope. */
      code?: string;
      error: string;
      issues?: unknown[];
      /** Legacy debug field — only populated in dev. */
      debug?: { stack?: string };
      requestId?: string;
    };

/**
 * Wrap a server-action body so any thrown error is converted into the
 * standard `{ ok: false, code, error, issues? }` envelope via `mapToHttpError`.
 *
 * Usage:
 * ```ts
 * "use server";
 * export async function placeBidAction(input: BidInput): Promise<ActionResult<BidPlaced>> {
 * return wrapAction(async () => {
 * const parsed = bidSchema.parse(input);
 * return await bidRepository.place(parsed);
 * });
 * }
 * ```
 *
 * `wrapAction` itself never throws. Callers can rely on the returned envelope.
 *
 * 🛑 BECAUSE it never throws, it is also the ONLY thing that will ever see the
 * failure. Next.js calls `onRequestError` only for errors that ESCAPE a server
 * action; converting the throw into a return value means that hook never fires.
 * This catch used to be `void normalizeError(err)` — a pure classifier whose
 * result is discarded — and then a return: no log, no store, no rethrow. All
 * 222 server actions in this codebase (68 in appkit, 154 in the consumer) were
 * therefore completely unobserved, which is why the bid failure this was
 * written for had to be reported from a screenshot. Anything added here must
 * keep recording; silence is the bug.
 */
export async function wrapAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    void normalizeError(err);
    const mapped = mapToHttpError(err, {
      isProduction: process.env.NODE_ENV === "production",
    });

    // Record 5xx and datastore-level failures. 4xx business outcomes ("bid too
    // low", "coupon expired") are the action working correctly and would drown
    // the store — this is the same threshold createRouteHandler applies.
    if (mapped.status >= 500 || mapped.infrastructure) {
      // internalMessage ?? message — `message` is scrubbed for 5xx in
      // production, and recording the scrubbed copy would defeat the point.
      const cause = describeCauseChain(err);
      reportActionError({
        code: mapped.code,
        message: mapped.internalMessage ?? mapped.message,
        stack: err instanceof Error ? err.stack : undefined,
        ...(cause ? { cause } : {}),
      });
    }

    return {
      ok: false,
      code: mapped.code,
      error: mapped.message,
      ...(mapped.issues ? { issues: mapped.issues } : {}),
    } as ActionResult<T>;
  }
}

/** Type guard for ActionResult success arm. */
export function isOk<T>(
  result: ActionResult<T>,
): result is { ok: true; data: T } {
  return result.ok === true;
}

/** Throw if the envelope is a failure. Useful for code that wants the legacy throw semantics. */
export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw Object.assign(new Error(result.error), { code: result.code });
}
