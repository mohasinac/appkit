import { ApiError, isApiError } from "./ApiError";
import { getErrorDisplay } from "../../errors/error-display-map";

/**
 * Public surface for the client-side error router.
 *
 * Given any thrown value, this helper:
 *  - If `err` is an `ApiError` and the code maps to a form field AND a
 *    setFieldError function is provided → routes to inline field error.
 *  - Otherwise → calls `showToast(translatedMessage, "error")`.
 *  - Fires `reportClientError(...)` for any non-ApiError that escapes a handler
 *    (server-side ApiErrors are already in serverErrors; we don't double-count).
 *
 * Both `showToast` and the optional `setFieldError` / `translate` are injected
 * by the caller — surfaceError does NOT depend on `useToast` directly, so it
 * can be called from outside React hook boundaries (e.g. inside Button's
 * non-hook handleClick wrapper).
 */
export interface SurfaceErrorOptions {
  showToast: (message: string, variant?: "error" | "warning" | "info" | "success" | "loading") => void;
  setFieldError?: (field: string, message: string) => void;
  /** next-intl style translator. Falls back to the raw error message when undefined. */
  translate?: (key: string) => string;
  /** Optional reporter for the clientErrors / serverErrors collection. */
  report?: (payload: {
    code: string;
    message: string;
    stack?: string;
    requestId?: string;
  }) => void;
}

export function surfaceError(err: unknown, opts: SurfaceErrorOptions): void {
  const { showToast, setFieldError, translate, report } = opts;

  if (isApiError(err)) {
    const display = getErrorDisplay(err.code);
    const message = translate?.(display.messageKey) ?? err.message;

    if (display.field && setFieldError) {
      setFieldError(display.field, message);
      return;
    }
    showToast(message, "error");
    return;
  }

  // Non-ApiError — this is a programming error or unhandled exception.
  // Report it (workstream 13) so clientErrors picks it up.
  const message =
    err instanceof Error ? err.message : "Something went wrong. Please try again.";
  const fallback = translate?.("errors.codes.CLIENT_UNHANDLED") ?? message;
  showToast(fallback, "error");

  if (report) {
    try {
      report({
        code: "CLIENT_UNHANDLED",
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    } catch {
      // never let the reporter break the catch path
    }
  }

  // Re-throw if it's a non-Error so framework error boundaries still see it.
  if (!(err instanceof Error)) {
    throw err;
  }
}

export { ApiError, isApiError } from "./ApiError";
