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
