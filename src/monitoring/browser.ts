export {
  ErrorSeverity,
  ErrorCategory,
  setErrorTracker,
  trackError,
  trackApiError,
  trackAuthError,
  trackValidationError,
  trackDatabaseError,
  trackPermissionError,
} from "./error-tracking";
export type {
  ErrorContext,
  TrackedError,
  ErrorTrackerFn,
} from "./error-tracking";

export {
  getCacheMetrics,
  recordCacheHit,
  recordCacheMiss,
  resetCacheMetrics,
  getCacheHitRate,
  isCacheHitRateLow,
  getCacheStatistics,
} from "./cache-metrics";

export { setupGlobalErrorHandler, setupCacheMonitoring } from "./runtime";

export {
  logClientError,
  logClientWarning,
  logClientInfo,
  logClientDebug,
  logApiError,
  logValidationError,
  logNavigationError,
  logAuthError,
  logUploadError,
  logPaymentError,
  logApplicationError,
  initializeClientLogger,
} from "./client-logger";
export type { ClientErrorContext } from "./client-logger";

export {
  setPerformanceProvider,
  startTrace,
  stopTrace,
  addTraceAttribute,
  addTraceMetric,
} from "./performance";
export type { PerformanceTrace, PerformanceProvider } from "./performance";

/*
 * The Firebase-Analytics module that lived at ./analytics was deleted
 * 2026-08-31. It defined 11 events, `initializeAnalytics` and `trackEvent`, and
 * had ZERO call sites anywhere — it was re-exported through three barrels and
 * never invoked once.
 *
 * Site analytics now runs through `siteSettings.integrations`
 * (GA / GTM / Meta Pixel), emitted by `src/components/analytics/AnalyticsScripts`.
 * Wiring a second, unrelated system in parallel would have given the project
 * two answers to "how is this page counted", which is how it ended up with two
 * view counters that could never reconcile.
 */