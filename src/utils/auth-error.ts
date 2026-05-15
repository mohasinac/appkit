/**
 * Detects auth/authorization errors thrown by server actions or fetch responses.
 *
 * Pass the caught error (and optionally the HTTP status code for fetch-based
 * callers) to determine whether the caller should prompt the user to log in
 * rather than displaying a generic error message.
 */
export function isAuthError(err: unknown, httpStatus?: number): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("not authenticated") ||
    msg.includes("unauthenticated") ||
    msg.includes("authentication required") ||
    msg.includes("invalid or expired session") ||
    msg.includes("sign in to") ||
    msg === "error 401" ||
    msg === "error 403"
  );
}
