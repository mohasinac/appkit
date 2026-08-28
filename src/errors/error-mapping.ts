import { AppError } from "./base-error";
import { ApiError } from "./api-error";
import { ValidationError } from "./validation-error";
import { AuthenticationError } from "./authentication-error";
import { AuthorizationError } from "./authorization-error";
import { NotFoundError } from "./not-found-error";
import { DatabaseError } from "./database-error";
import type { JsonValue } from "@mohasinac/appkit";

/**
 * Codes emitted by the wire that are not present in the AppError-class enums.
 * Added so the client display map and i18n keys can resolve them.
 */
export const HTTP_ERROR_CODES = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  RATE_LIMITED: "RATE_LIMITED",
  PRECONDITION_FAILED: "PRECONDITION_FAILED",
  CONCURRENT_MODIFICATION: "CONCURRENT_MODIFICATION",
  INTERNAL: "INTERNAL",
  UNAVAILABLE: "UNAVAILABLE",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  DEGRADED_READ: "DEGRADED_READ",
  PAYMENT_ROLLBACK_ATTEMPTED: "PAYMENT_ROLLBACK_ATTEMPTED",
  PAYMENT_ROLLBACK_FAILED: "PAYMENT_ROLLBACK_FAILED",
  VERIFICATION_EMAIL_FAILED: "VERIFICATION_EMAIL_FAILED",
  CONFIRMATION_EMAIL_FAILED: "CONFIRMATION_EMAIL_FAILED",
  CLIENT_BOUNDARY: "CLIENT_BOUNDARY",
  CLIENT_PROMISE_REJECTION: "CLIENT_PROMISE_REJECTION",
  CLIENT_WINDOW_ERROR: "CLIENT_WINDOW_ERROR",
  CLIENT_UNHANDLED: "CLIENT_UNHANDLED",
} as const;

export type HttpErrorCode =
  (typeof HTTP_ERROR_CODES)[keyof typeof HTTP_ERROR_CODES];

export interface MappedError {
  status: number;
  code: string;
  /**
   * The CLIENT-FACING message. For any `status >= 500` in production this is a
   * generic string — never the thrown error's own text.
   */
  message: string;
  /**
   * The unscrubbed message, present only when `message` was replaced.
   *
   * 🛑 Recorders (serverErrors, logs) MUST use `internalMessage ?? message`.
   * Responses MUST use `message`. The whole point of the split is that
   * scrubbing the UI must not blind the log store — before this existed, the
   * raw text was the only copy of the fault and it was being shipped to the
   * browser instead (a `/var/task/...` path leaked to end users), while
   * scrubbing it naively would have left nothing anywhere.
   */
  internalMessage?: string;
  issues?: unknown[];
  /**
   * True when the status/code came from the FIRESTORE error map — i.e. the
   * datastore itself refused, rather than our own business logic deciding.
   *
   * Needed because the two are indistinguishable by code alone. Firestore
   * `permission-denied` (an expired service-account key) and
   * `resource-exhausted` (quota blown) map to 403/429 — exactly the codes our
   * RBAC guard and rate limiter emit in normal operation. Before this flag,
   * those infrastructure failures fell below the `status >= 500` persist
   * threshold and were recorded nowhere; adding their CODES to
   * `LOG_AS_INCIDENT_CODES` instead would have persisted every ordinary 404
   * and every rate-limited request along with them.
   */
  infrastructure?: boolean;
}

/** Shown to users for any 5xx in production. */
const GENERIC_5XX_MESSAGE = "An internal error occurred";

interface ZodLikeError {
  issues: unknown[];
}

function isZodLikeError(err: unknown): err is ZodLikeError {
  return (
    typeof err === "object" &&
    err !== null &&
    "issues" in err &&
    Array.isArray((err as { issues: JsonValue }).issues)
  );
}

interface FirestoreLikeError {
  code: number | string;
  message?: string;
}

function isFirestoreLikeError(err: unknown): err is FirestoreLikeError {
  if (typeof err !== "object" || err === null) return false;
  const codeVal = (err as { code?: JsonValue }).code;
  return typeof codeVal === "number" || typeof codeVal === "string";
}

const FIRESTORE_NUMERIC_MAP: Record<number, { status: number; code: string }> = {
  5: { status: 404, code: HTTP_ERROR_CODES.NOT_FOUND },
  6: { status: 409, code: HTTP_ERROR_CODES.ALREADY_EXISTS },
  7: { status: 403, code: HTTP_ERROR_CODES.PERMISSION_DENIED },
  8: { status: 429, code: HTTP_ERROR_CODES.RATE_LIMITED },
  9: { status: 409, code: HTTP_ERROR_CODES.PRECONDITION_FAILED },
  10: { status: 409, code: HTTP_ERROR_CODES.CONCURRENT_MODIFICATION },
  13: { status: 500, code: HTTP_ERROR_CODES.INTERNAL },
  14: { status: 503, code: HTTP_ERROR_CODES.UNAVAILABLE },
  16: { status: 401, code: HTTP_ERROR_CODES.UNAUTHENTICATED },
};

const FIRESTORE_STRING_MAP: Record<string, { status: number; code: string }> = {
  "not-found": { status: 404, code: HTTP_ERROR_CODES.NOT_FOUND },
  "already-exists": { status: 409, code: HTTP_ERROR_CODES.ALREADY_EXISTS },
  "permission-denied": {
    status: 403,
    code: HTTP_ERROR_CODES.PERMISSION_DENIED,
  },
  "resource-exhausted": { status: 429, code: HTTP_ERROR_CODES.RATE_LIMITED },
  "failed-precondition": {
    status: 409,
    code: HTTP_ERROR_CODES.PRECONDITION_FAILED,
  },
  aborted: { status: 409, code: HTTP_ERROR_CODES.CONCURRENT_MODIFICATION },
  internal: { status: 500, code: HTTP_ERROR_CODES.INTERNAL },
  unavailable: { status: 503, code: HTTP_ERROR_CODES.UNAVAILABLE },
  unauthenticated: { status: 401, code: HTTP_ERROR_CODES.UNAUTHENTICATED },
};

function mapFirestore(err: FirestoreLikeError): MappedError | null {
  const numeric =
    typeof err.code === "number" ? FIRESTORE_NUMERIC_MAP[err.code] : undefined;
  const stringy =
    typeof err.code === "string" ? FIRESTORE_STRING_MAP[err.code] : undefined;
  const mapped = numeric ?? stringy;
  if (!mapped) return null;
  return {
    status: mapped.status,
    code: mapped.code,
    message: err.message ?? mapped.code,
    infrastructure: true,
  };
}

/**
 * Map any thrown value to a stable HTTP error envelope shape.
 *
 * Order of precedence:
 *  - AppError subclasses use their declared statusCode + code
 *  - DatabaseError unwraps its `data` to look for a wrapped FirestoreError
 *  - FirestoreError (numeric .code or string .code) maps via the table above
 *  - ZodError shape maps to 400 VALIDATION_FAILED + issues
 *  - Unknown Error → 500 INTERNAL
 *
 * Production scrubbing of 5xx messages is applied ONCE, by `mapToHttpError`
 * below — deliberately not inside these branches. See the note there.
 */
function classifyError(
  err: unknown,
  opts?: { isProduction?: boolean },
): MappedError {
  const isProduction = opts?.isProduction ?? false;

  // AppError subclasses first — they carry status + code authoritatively
  if (err instanceof ValidationError) {
    return {
      status: 400,
      code: HTTP_ERROR_CODES.VALIDATION_FAILED,
      message: err.message,
      issues: isZodLikeError(err.data) ? err.data.issues : undefined,
    };
  }
  if (err instanceof AuthenticationError) {
    return {
      status: 401,
      code: HTTP_ERROR_CODES.UNAUTHENTICATED,
      message: err.message,
    };
  }
  if (err instanceof AuthorizationError) {
    return {
      status: 403,
      code: HTTP_ERROR_CODES.FORBIDDEN,
      message: err.message,
    };
  }
  if (err instanceof NotFoundError) {
    return {
      status: 404,
      code: HTTP_ERROR_CODES.NOT_FOUND,
      message: err.message,
    };
  }
  if (err instanceof DatabaseError) {
    // DatabaseError typically wraps an underlying Firestore error in `data`
    if (isFirestoreLikeError(err.data)) {
      const mapped = mapFirestore(err.data);
      if (mapped) return { ...mapped, message: err.message };
    }
    return {
      status: err.statusCode || 500,
      code: err.code || HTTP_ERROR_CODES.INTERNAL,
      message: err.message,
    };
  }
  if (err instanceof ApiError) {
    return {
      status: err.statusCode,
      code: err.code,
      message: err.message,
    };
  }
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      code: err.code,
      message: err.message,
    };
  }

  // Bare FirestoreError (thrown without DatabaseError wrap)
  if (isFirestoreLikeError(err)) {
    const mapped = mapFirestore(err);
    if (mapped) return mapped;
  }

  // Zod error (thrown without ValidationError wrap)
  if (isZodLikeError(err)) {
    return {
      status: 400,
      code: HTTP_ERROR_CODES.VALIDATION_FAILED,
      message: "Validation failed",
      issues: err.issues,
    };
  }

  // Object with explicit { status, message } shape (legacy throw-with-status)
  if (typeof err === "object" && err !== null) {
    const e = err as { status?: JsonValue; statusCode?: unknown; message?: unknown };
    const status =
      typeof e.statusCode === "number"
        ? e.statusCode
        : typeof e.status === "number"
          ? e.status
          : null;
    if (status !== null) {
      return {
        status,
        code: status === 401
          ? HTTP_ERROR_CODES.UNAUTHENTICATED
          : status === 403
            ? HTTP_ERROR_CODES.FORBIDDEN
            : status === 404
              ? HTTP_ERROR_CODES.NOT_FOUND
              : status >= 500
                ? HTTP_ERROR_CODES.INTERNAL
                : HTTP_ERROR_CODES.VALIDATION_FAILED,
        message:
          typeof e.message === "string" ? e.message : "An error occurred",
      };
    }
  }

  // Unknown
  void isProduction; // scrubbing happens once, in mapToHttpError
  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : GENERIC_5XX_MESSAGE;

  return {
    status: 500,
    code: HTTP_ERROR_CODES.INTERNAL,
    message: rawMessage,
  };
}

/**
 * Classify a thrown value AND make the result safe to send to a browser.
 *
 * 🛑 The scrub is keyed on **status**, not on which branch matched.
 *
 * It used to be the other way round: `isProduction` was consulted in exactly
 * one place — the unknown-error tail at the bottom of `classifyError` — while
 * the `DatabaseError`, `AppError` and `ApiError` branches above it returned
 * `err.message` verbatim, in production. Since almost every real 500 in this
 * codebase is a `DatabaseError`, the scrub essentially never ran. That is how
 * a Node `MODULE_NOT_FOUND` — including the absolute server path
 * `/var/task/.next/server/chunks/...` and its full require stack — was rendered
 * as user-facing copy inside the "Place your bid" modal.
 *
 * Keying on status means a branch added later cannot reintroduce the leak by
 * forgetting to check a flag.
 *
 * 4xx messages are NOT scrubbed: they are deliberate, user-actionable copy
 * ("Bid too low", "Coupon expired") produced by our own validation, and
 * replacing them with a generic string would make the product worse.
 */
export function mapToHttpError(
  err: unknown,
  opts?: { isProduction?: boolean },
): MappedError {
  const isProduction = opts?.isProduction ?? false;
  const mapped = classifyError(err, opts);

  if (!isProduction || mapped.status < 500) return mapped;
  if (mapped.message === GENERIC_5XX_MESSAGE) return mapped;

  return {
    ...mapped,
    message: GENERIC_5XX_MESSAGE,
    internalMessage: mapped.message,
  };
}
