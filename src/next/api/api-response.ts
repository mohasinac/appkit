/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all Next.js API routes.
 * No app-specific dependencies — safe to use in any project.
 */

import { NextResponse } from "next/server";
import type { JsonValue } from "@mohasinac/appkit";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  meta?: Record<string, JsonValue>;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  // audit-unknown-ok: Generic response wrapper — issues field arbitrary
  details?: unknown;
}

export function successResponse<T>(
  data?: T,
  message?: string,
  status: number = 200,
  meta?: Record<string, JsonValue>,
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
  // audit-unknown-ok: Generic response wrapper — issues field arbitrary
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

  // audit-unknown-ok: Generic response wrapper — issues field arbitrary
  badRequest: (message = "Bad request", details?: unknown) =>
    errorResponse(message, 400, details),

  internalError: (message = "Internal server error") =>
    errorResponse(message, 500),

  validationError: (details: Error) =>
    errorResponse("Validation failed", 422, details),
};
