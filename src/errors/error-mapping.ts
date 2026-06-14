import { AppError } from "./base-error";
import { ApiError } from "./api-error";
import { ValidationError } from "./validation-error";
import { AuthenticationError } from "./authentication-error";
import { AuthorizationError } from "./authorization-error";
import { NotFoundError } from "./not-found-error";
import { DatabaseError } from "./database-error";

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
  message: string;
  issues?: unknown[];
}

interface ZodLikeError {
  issues: unknown[];
}

function isZodLikeError(err: unknown): err is ZodLikeError {
  return (
    typeof err === "object" &&
    err !== null &&
    "issues" in err &&
    Array.isArray((err as { issues: unknown }).issues)
  );
}

interface FirestoreLikeError {
  code: number | string;
  message?: string;
}

function isFirestoreLikeError(err: unknown): err is FirestoreLikeError {
  if (typeof err !== "object" || err === null) return false;
  const codeVal = (err as { code?: unknown }).code;
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
 *  - Unknown Error → 500 INTERNAL; message scrubbed when isProduction
 */
export function mapToHttpError(
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
    const e = err as { status?: unknown; statusCode?: unknown; message?: unknown };
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

  // Unknown — keep message in dev, scrub in prod
  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "An internal error occurred";

  return {
    status: 500,
    code: HTTP_ERROR_CODES.INTERNAL,
    message: isProduction ? "An internal error occurred" : rawMessage,
  };
}
