/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all Next.js API routes.
 * No app-specific dependencies — safe to use in any project.
 */

import { NextResponse } from "next/server";
import type { JsonValue } from "@mohasinac/appkit";
import type { ApiIssue } from "../../client/api/ApiError";
import {
  buildErrorEnvelope,
  type ApiErrorEnvelope,
} from "../../errors/error-envelope";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  meta?: Record<string, JsonValue>;
}

export type ApiErrorResponse = ApiErrorEnvelope;

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

/**
 * Options for an error response.
 *
 * This replaced a bare `details?: unknown` third positional argument that was
 * carrying three mutually incompatible things across the codebase — a stable
 * code string, an array of Zod issues, and arbitrary server-side context —
 * all serialised under a `details` key that no client ever read. Narrowing the
 * type is what let `tsc` enumerate every call site so each could be given the
 * meaning it actually intended.
 *
 * Server-side context does NOT belong here: it goes to `serverLogger`. Only
 * things the client can act on cross the wire.
 */
export interface ErrorResponseOptions {
  /** Stable machine code. Defaults to one derived from `status`. */
  code?: string;
  /** Field-level validation issues — routed to inline field errors by `surfaceError`. */
  issues?: ApiIssue[];
  requestId?: string;
}

export function errorResponse(
  error: string,
  status: number = 400,
  opts?: ErrorResponseOptions,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    buildErrorEnvelope({ message: error, status, ...opts }),
    // `no-store` — without this, Vercel's edge CDN can cache a transient
    // error response (cold-start 500, not-yet-synced 404) on a public GET
    // route indefinitely. Same root cause as the /media 404-caching bug.
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Pre-built shorthand factories for common HTTP error responses. */
export const ApiErrors = {
  unauthorized: (message = "Unauthorized") => errorResponse(message, 401),

  forbidden: (message = "Forbidden") => errorResponse(message, 403),

  notFound: (resource = "Resource") =>
    errorResponse(`${resource} not found`, 404),

  badRequest: (message = "Bad request", opts?: ErrorResponseOptions) =>
    errorResponse(message, 400, opts),

  internalError: (message = "Internal server error") =>
    errorResponse(message, 500),

  // `validationError` used to live here as a 422 taking a raw `Error`. It had
  // ZERO call sites, and its status disagreed with every other validation
  // producer (`apiHandler`, `routeHandler` and `mapToHttpError` all use 400).
  // Deleted rather than aligned — a fourth spelling of "the body was invalid"
  // is what this whole file is trying to stop having.
};
