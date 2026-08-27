/**
 * Error Tracking — Provider-agnostic types, enums, and utilities.
 *
 * Implementations that require Firebase Crashlytics or external SDKs should
 * be wired in the app's monitoring setup by calling setErrorTracker().
 */

import type { JsonValue } from "../schemas/types";

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  AUTHENTICATION = "authentication",
  API = "api",
  DATABASE = "database",
  VALIDATION = "validation",
  NETWORK = "network",
  PERMISSION = "permission",
  UI = "ui",
  UNKNOWN = "unknown",
}

export interface ErrorContext {
  userId?: string;
  userRole?: string;
  page?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, JsonValue>;
}

export interface TrackedError {
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext;
  timestamp: string;
}

export type ErrorTrackerFn = (
  error: Error | string,
  category: ErrorCategory,
  severity: ErrorSeverity,
  context?: ErrorContext,
) => void;

const TRACKER_KEY = "__mohasinac_error_tracker__" as const;

type GlobalWithTracker = typeof globalThis & {
  [key: string]: ErrorTrackerFn | undefined;
};

/**
 * Default sink — structured, severity-tagged JSON on the server.
 *
 * `setErrorTracker()` is exported so an app can install Sentry or similar, and
 * its only reference anywhere in this repo was its own doc comment: nothing ever
 * called it. So every tracked error went out as a plain `console.error` string,
 * which Cloud Logging files as unparsed DEFAULT severity — invisible to any
 * severity filter or alert.
 *
 * Emitting `{severity, message, stack}` fixes that with no dependency and no
 * DSN: GCP Error Reporting automatically ingests ERROR-severity log entries
 * that carry a stack trace.
 *
 * The formatting is inlined rather than delegated to `serverLogger` on purpose.
 * This module is re-exported from `client.ts`, and `server-logger` imports
 * `next/server` — importing it here would pull server-only code along every
 * client import chain, which is how Root Cause #24 gets reproduced. Eight lines
 * of duplicated shape is the cheaper trade.
 */
function defaultTracker(
  error: Error | string,
  category: ErrorCategory,
  severity: ErrorSeverity,
  context?: ErrorContext,
): void {
  const isError = error instanceof Error;
  const message = isError ? error.message : error;

  // In a browser there is no log collector to parse JSON, and a readable console
  // entry is worth more to whoever is looking at it.
  if (typeof window !== "undefined") {
    console.error(`[${severity.toUpperCase()}][${category}] ${message}`, context);
    return;
  }

  console.error(
    JSON.stringify({
      severity: "ERROR",
      message,
      category,
      errorSeverity: severity,
      timestamp: new Date().toISOString(),
      ...(isError && error.stack ? { stack: error.stack } : {}),
      ...(context ? { context } : {}),
    }),
  );
}

function getTracker(): ErrorTrackerFn {
  return (globalThis as GlobalWithTracker)[TRACKER_KEY] ?? defaultTracker;
}

/** Override the default console-based tracker with a custom implementation. */
export function setErrorTracker(fn: ErrorTrackerFn): void {
  (globalThis as Record<string, unknown>)[TRACKER_KEY] = fn;
}

export function trackError(
  error: Error | string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: ErrorContext,
): void {
  getTracker()(error, category, severity, context);
}

export function trackApiError(
  error: Error | string,
  context?: ErrorContext,
): void {
  trackError(error, ErrorCategory.API, ErrorSeverity.HIGH, context);
}

export function trackAuthError(
  error: Error | string,
  context?: ErrorContext,
): void {
  trackError(error, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, context);
}

export function trackValidationError(
  error: Error | string,
  context?: ErrorContext,
): void {
  trackError(error, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
}

export function trackDatabaseError(
  error: Error | string,
  context?: ErrorContext,
): void {
  trackError(error, ErrorCategory.DATABASE, ErrorSeverity.CRITICAL, context);
}

export function trackPermissionError(
  error: Error | string,
  context?: ErrorContext,
): void {
  trackError(error, ErrorCategory.PERMISSION, ErrorSeverity.MEDIUM, context);
}
