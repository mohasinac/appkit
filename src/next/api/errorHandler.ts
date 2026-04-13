/**
 * Generic API error handler for Next.js API routes.
 *
 * Framework-agnostic version of the app's handleApiError. Business-specific
 * error classes and loggers are injected via factory options so this module
 * has zero knowledge of Firebase, Resend, or letitrip.in domain logic.
 *
 * @example
 * ```ts
 * // apps/web/src/lib/api/error-handler.ts
 * import { createApiErrorHandler } from '..';
 * import { AppError } from '@/lib/errors';
 * import { serverLogger } from '@/lib/server-logger';
 *
 * export const handleApiError = createApiErrorHandler({
 *   isAppError: (e): e is AppError => e instanceof AppError,
 *   getStatusCode: (e) => e.statusCode,
 *   toJSON: (e) => e.toJSON(),
 *   logger: serverLogger,
 *   internalErrorCode: 'GEN_INTERNAL_ERROR',
 *   internalErrorMessage: 'An internal server error occurred',
 * });
 * ```
 */

import { NextResponse } from "next/server.js";

/** Minimal logger interface — satisfied by Winston, Pino, or console. */
export interface IApiErrorLogger {
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Options for createApiErrorHandler factory. */
export interface ApiErrorHandlerOptions<TAppError> {
  /**
   * Type guard — returns true when the thrown value is your app's AppError
   * (or any subclass) that has statusCode / toJSON methods.
   */
  isAppError(err: unknown): err is TAppError;

  /** Extract the HTTP status code from your AppError. */
  getStatusCode(err: TAppError): number;

  /** Serialise the error to a JSON-safe shape for the response body. */
  toJSON(err: TAppError): unknown;

  /** Logger used for 5xx and unexpected errors. */
  logger: IApiErrorLogger;

  /** Error code included in the 500 response body. */
  internalErrorCode?: string;

  /** Error message included in the 500 response body. */
  internalErrorMessage?: string;
}

/**
 * Build a typed handleApiError function bound to your app's error hierarchy.
 *
 * The returned function:
 * - Returns a typed NextResponse for known AppError subclasses.
 * - Returns a 400 with validation details for Zod-like error shapes.
 * - Logs unexpected errors server-side; returns a generic 500 (no stack trace
 *   leaks to the client).
 */
export function createApiErrorHandler<TAppError>(
  options: ApiErrorHandlerOptions<TAppError>,
) {
  const {
    isAppError,
    getStatusCode,
    toJSON,
    logger,
    internalErrorCode = "INTERNAL_ERROR",
    internalErrorMessage = "An internal server error occurred",
  } = options;

  return function handleApiError(error: unknown): NextResponse {
    // Known AppError subclass — structured response
    if (isAppError(error)) {
      const status = getStatusCode(error);
      if (status >= 500) {
        logger.error("API Error", {
          body: toJSON(error) as Record<string, unknown>,
        });
      }
      return NextResponse.json(toJSON(error), { status });
    }

    // Zod / similar validation error shape: { issues: [...] }
    if (
      error !== null &&
      typeof error === "object" &&
      "issues" in error &&
      Array.isArray((error as Record<string, unknown>).issues)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          data: error,
        },
        { status: 400 },
      );
    }

    // Unknown / unexpected error — log full details, return generic 500
    logger.error("Unexpected API error", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });

    return NextResponse.json(
      {
        success: false,
        error: internalErrorMessage,
        code: internalErrorCode,
      },
      { status: 500 },
    );
  };
}
