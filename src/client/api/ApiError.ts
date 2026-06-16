/**
 * Client-side error class thrown by apiClient / surfaceError. Carries the
 * server's stable `code`, the HTTP status, and any Zod issues so wrappers
 * can route the failure (toast vs inline field error vs error boundary).
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly issues?: unknown[];
  readonly requestId?: string;
  readonly cause?: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    options?: { issues?: unknown[]; requestId?: string; cause?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.issues = options?.issues;
    this.requestId = options?.requestId;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// audit-unknown-ok: type-narrowing entry point — accepts any value, narrows by typeof/Array.isArray
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
