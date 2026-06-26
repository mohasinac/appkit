/**
 * Client-side error class thrown by apiClient / surfaceError. Carries the
 * server's stable `code`, the HTTP status, and any Zod issues so wrappers
 * can route the failure (toast vs inline field error vs error boundary).
 */

/** Serialised Zod-issue shape as it arrives over the wire from the server. */
export interface ApiIssue {
  message: string;
  path?: (string | number)[];
  code?: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly issues?: ApiIssue[];
  readonly requestId?: string;
  readonly cause?: Error;

  constructor(
    code: string,
    message: string,
    status: number,
    options?: { issues?: ApiIssue[]; requestId?: string; cause?: Error },
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

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
