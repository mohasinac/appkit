import { normalizeError } from "../errors/normalize";
import { serverLogger } from "../monitoring/server-logger";

/**
 * Runs a non-critical promise in the background without blocking the caller.
 *
 * Use instead of `.catch(console.error)` for fire-and-forget operations
 * (view counters, audit logs, cache invalidations, RTDB cleanup) where the
 * caller must not fail even if the operation does.
 *
 * The operation's failure is logged at WARN level with the provided context
 * label so on-call engineers can find it in structured logs.
 *
 * @param promise  Already-started async operation.
 * @param context  Short label identifying the operation for log search (e.g. "blog: incrementViews").
 */
export function safeFireAndForget(promise: Promise<unknown>, context: string): void {
  promise.catch((err: unknown) => {
    void normalizeError(err);
    serverLogger.warn(`safeFireAndForget: ${context} failed (non-critical, caller unaffected)`, {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
