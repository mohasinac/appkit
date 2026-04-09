/**
 * Error Tracking — Provider-agnostic types, enums, and utilities.
 *
 * Implementations that require Firebase Crashlytics or external SDKs should
 * be wired in the app's monitoring setup by calling setErrorTracker().
 */

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
  metadata?: Record<string, unknown>;
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

declare global {
  // eslint-disable-next-line no-var
  var __mohasinac_error_tracker__: ErrorTrackerFn | undefined;
}

function getTracker(): ErrorTrackerFn {
  return (
    globalThis.__mohasinac_error_tracker__ ??
    ((error, category, severity, context) => {
      const msg = error instanceof Error ? error.message : error;
      console.error(`[${severity.toUpperCase()}][${category}] ${msg}`, context);
    })
  );
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
