/** Exponential-backoff retry for idempotent async operations.
 *
 * Use for GCS / Firestore transient errors (429, 503) where retrying is safe.
 * Do NOT use for non-idempotent writes unless the underlying operation is
 * already idempotent (e.g. Firestore set-with-merge at a known document path).
 *
 * @param fn         Async operation to attempt.
 * @param retries    Number of additional attempts after the first (default 2 → up to 3 total).
 * @param baseDelayMs  Base delay before first retry; doubles each attempt (default 200ms).
 */
import { normalizeError, NormalizedError } from "../errors/normalize";

export async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 200): Promise<T> {
  let lastErr: NormalizedError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = normalizeError(err);
      if (attempt < retries) {
        await new Promise<void>((res) => setTimeout(res, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}
