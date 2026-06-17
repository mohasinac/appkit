import { normalizeError } from "../../../errors/normalize";
import { mapToHttpError } from "../../../errors/error-mapping";

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
      // audit-unknown-ok: generic Zod issues field — caller-defined schema
      issues?: unknown[];
      /** Legacy server-action shape — kept for compat. */
      fieldErrors?: Record<string, string[]>;
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
