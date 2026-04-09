import { NextResponse } from "next/server.js";
import { AppError } from "./base-error";
import { ERROR_CODES, ERROR_MESSAGES } from "./error-codes";

/**
 * Handle API errors with consistent response format.
 * Use in Next.js API route catch blocks.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error("[API Error]", {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        data: error.data,
      });
    }
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Zod / schema validation errors
  if (error && typeof error === "object" && "issues" in error) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        code: ERROR_CODES.VALIDATION_INVALID_INPUT,
        data: error,
      },
      { status: 400 },
    );
  }

  console.error("[Unexpected API Error]", {
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  });

  return NextResponse.json(
    {
      success: false,
      error: ERROR_MESSAGES[ERROR_CODES.GEN_INTERNAL_ERROR],
      code: ERROR_CODES.GEN_INTERNAL_ERROR,
    },
    { status: 500 },
  );
}

/**
 * Log an error with optional context. Wraps console.error for package portability;
 * replace with your structured logger if needed.
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>,
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
