import { NextResponse } from "next/server.js";
import type { JsonValue } from "@mohasinac/appkit";
import { AppError } from "./base-error";
import { mapToHttpError } from "./error-mapping";
import { buildErrorEnvelope, toApiIssues } from "./error-envelope";

/**
 * Handle API errors with consistent response format.
 * Use in Next.js API route catch blocks.
 *
 * Delegates classification to `mapToHttpError` — the same table `createRouteHandler`
 * uses — so `DatabaseError`/bare Firestore error codes/`ApiError` are classified
 * correctly here too, instead of silently falling through to a generic 500 the way
 * this function previously did for anything that wasn't an `AppError` or a Zod-shaped
 * object. Response shape is unchanged for existing callers.
 */
export function handleApiError(error: unknown): NextResponse {
  const mapped = mapToHttpError(error, {
    isProduction: process.env.NODE_ENV === "production",
  });

  if (mapped.status >= 500) {
    console.error("[API Error]", {
      code: mapped.code,
      message: mapped.message,
      statusCode: mapped.status,
      data: error instanceof AppError ? error.data : undefined,
    });
  }

  // `issues` go at the TOP LEVEL. They used to be nested under
  // `data.issues`, and `ApiClientError` reads `body.issues` — so this
  // producer's field errors were as dead as `api-response.ts`'s were.
  //
  // `statusCode` is dropped: it only ever duplicated the HTTP status, and
  // nothing read it off the body.
  return NextResponse.json(
    {
      ...buildErrorEnvelope({
        message: mapped.message,
        status: mapped.status,
        code: mapped.code,
        issues: toApiIssues(mapped.issues),
      }),
      ...(error instanceof AppError && error.data !== undefined
        ? { data: error.data }
        : {}),
    },
    { status: mapped.status },
  );
}

/**
 * Log an error with optional context. Wraps console.error for package portability;
 * replace with your structured logger if needed.
 */
export function logError(
  error: unknown,
  context?: Record<string, JsonValue>,
): void {
  console.error("[Application Error]", {
    ...(context && { context }),
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  });
}

/**
 * Type guard — check if a value is an AppError instance.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
