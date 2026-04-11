/**
 * Global Runtime Error Bootstrap
 *
 * Sets up window-level unhandled error/rejection forwarding to the
 * configured error tracker. Import once in instrumentation.ts or layout.tsx.
 */

import { trackError } from "./error-tracking";

/**
 * Attach window-level listeners that forward uncaught errors and unhandled
 * promise rejections to `trackError`. Safe to call multiple times — only
 * registers once per window lifecycle.
 */
export function setupGlobalErrorHandler(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("unhandledrejection", (event) => {
    trackError(event.reason);
  });

  window.addEventListener("error", (event) => {
    trackError(event.error ?? event.message);
  });
}

/**
 * Placeholder — wire up cache metric collection here once a backend flush
 * target is configured (e.g. flush to Datadog / custom endpoint).
 */
export function setupCacheMonitoring(): void {}
