/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all Next.js API routes.
 * No app-specific dependencies — safe to use in any project.
 */

import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export function successResponse<T>(
  data?: T,
  message?: string,
  status: number = 200,
  meta?: Record<string, unknown>,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(meta && { meta }),
    },
    { status },
  );
}

export function errorResponse(
  error: string,
  status: number = 400,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details !== undefined && { details }),
    },
    { status },
  );
}

/** Pre-built shorthand factories for common HTTP error responses. */
export const ApiErrors = {
  unauthorized: (message = "Unauthorized") => errorResponse(message, 401),

  forbidden: (message = "Forbidden") => errorResponse(message, 403),

  notFound: (resource = "Resource") =>
    errorResponse(`${resource} not found`, 404),

  badRequest: (message = "Bad request", details?: unknown) =>
    errorResponse(message, 400, details),

  internalError: (message = "Internal server error") =>
    errorResponse(message, 500),

  validationError: (details: unknown) =>
    errorResponse("Validation failed", 422, details),
};
