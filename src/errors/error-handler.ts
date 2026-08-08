import { NextResponse } from "next/server.js";
import type { JsonValue } from "@mohasinac/appkit";
import { AppError } from "./base-error";
import { mapToHttpError } from "./error-mapping";

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

  return NextResponse.json(
    {
      success: false,
      error: mapped.message,
      code: mapped.code,
      statusCode: mapped.status,
      ...(error instanceof AppError && error.data !== undefined
        ? { data: error.data }
        : mapped.issues
          ? { data: { issues: mapped.issues } }
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
