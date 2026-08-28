import { isApiError, type ApiIssue } from "./ApiError";
import { ApiClientError } from "../../http/ApiClient";
import { applyZodIssues, hasAttachableIssue } from "../../ui/forms/apply-zod-issues";
import { normalizeError } from "../../errors/normalize";
import { getErrorDisplay, toUserMessage } from "../../errors/error-display-map";
import { HTTP_ERROR_CODES } from "../../errors/error-mapping";

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
  /**
   * next-intl style translator. When undefined the chain degrades to
   * `fallbackMessage` and then to generic copy — NEVER to `err.message`.
   */
  translate?: (key: string) => string;
  /**
   * Curated copy used when the code resolves to no translation. Must be
   * authored text; never a value derived from an error object.
   *
   * Never overrides field-level `issues` — those are more specific than any
   * caller-supplied sentence.
   */
  fallbackMessage?: string;
  /** Optional reporter for the clientErrors / serverErrors collection. */
  report?: (payload: {
    code: string;
    message: string;
    stack?: string;
    requestId?: string;
  }) => void;
}

/** True for `ApiError` instances and for `ApiClientError` (the lower-level
 * error `ApiClient.request()` throws) when it carries a stable `code` —
 * both shapes route through the same toast-vs-inline-field-error logic
 * below. */
function hasStableErrorCode(err: unknown): err is { code: string; message: string } {
  return isApiError(err) || (err instanceof ApiClientError && typeof err.code === "string");
}

/** Field-level issues carried by either error shape, when present. */
function issuesOf(err: unknown): ApiIssue[] | undefined {
  if (isApiError(err)) return err.issues;
  if (err instanceof ApiClientError) return err.issues;
  return undefined;
}

export function surfaceError(err: unknown, opts: SurfaceErrorOptions): void {
  const { showToast, setFieldError, translate, report, fallbackMessage } = opts;

  // ISSUES FIRST. A validation failure names the fields it is about, and the
  // right place for "photoURL must be …" is under the photoURL input — not a
  // toast that says "Validation failed" and nothing else.
  //
  // This branch could not fire before: `errorResponse` serialised Zod issues
  // under a `details` key that `ApiClientError` never read, so `err.issues`
  // was always undefined and every schema rejection on every route fell
  // through to the generic toast below.
  //
  // `ERROR_DISPLAY_MAP` deliberately has no `field` for VALIDATION_FAILED —
  // a validation failure is not tied to one fixed field, which is exactly why
  // the routing has to come from the issues themselves.
  const issues = issuesOf(err);
  if (setFieldError && hasAttachableIssue(issues)) {
    applyZodIssues(issues!, (name, message) => setFieldError(name, message ?? ""));
    return; // inline errors only — no toast
  }

  if (hasStableErrorCode(err)) {
    const display = getErrorDisplay(err.code);
    // `?? err.message` used to terminate this chain. With no `translate` and no
    // `fallbackMessage` — the shape most call sites use — that surfaced the
    // SERVER's own message, which for a 5xx is its internals. `toUserMessage`
    // ends at `errors.codes.UNKNOWN` instead.
    const message = toUserMessage(err.code, translate, {
      fallback: fallbackMessage,
    });

    if (display.field && setFieldError) {
      setFieldError(display.field, message);
      return;
    }
    showToast(message, "error");
    return;
  }

  // Non-ApiError — a programming error or unhandled exception.
  //
  // The raw text is REPORTED (below) but never SHOWN. That split is the point:
  // this branch is where a raw Node/DOM string arrives, and it used to be
  // toasted verbatim whenever no translator was supplied.
  const internalMessage =
    err instanceof Error ? err.message : String(err ?? "unknown error");

  showToast(
    toUserMessage(HTTP_ERROR_CODES.CLIENT_UNHANDLED, translate, {
      fallback: fallbackMessage,
    }),
    "error",
  );

  if (report) {
    try {
      report({
        code: "CLIENT_UNHANDLED",
        message: internalMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
    } catch (_err) {
      void normalizeError(_err); // error reporter must never break the catch path — it is a pure side-effect sink
    }
  }

  // Re-throw if it's a non-Error so framework error boundaries still see it.
  if (!(err instanceof Error)) {
    throw err;
  }
}

export { ApiError, isApiError } from "./ApiError";
