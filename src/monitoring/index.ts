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
export {
  setupGlobalErrorHandler,
  setupCacheMonitoring,
} from "./runtime";
export {
  logClientError,
  logClientWarning,
  logClientInfo,
  logClientDebug,
} from "./client-logger";
export type { ClientErrorContext } from "./client-logger";
export {
  logServerError,
  logServerWarning,
  logServerInfo,
  logServerDebug,
  extractRequestMetadata,
} from "./server-logger";
export type { ServerErrorContext } from "./server-logger";
export {
  setPerformanceProvider,
  startTrace,
  stopTrace,
  addTraceAttribute,
  addTraceMetric,
} from "./performance";
export type { PerformanceTrace, PerformanceProvider } from "./performance";
