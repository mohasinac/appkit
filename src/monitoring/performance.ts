/**
 * Provider-Agnostic Performance Tracing
 *
 * Provides a thin abstraction over any performance tracing backend.
 * Wire a concrete implementation via `setPerformanceProvider()` — e.g. a
 * Firebase Performance, Datadog RUM, or web-vitals adapter.
 *
 * Without a provider the helpers are silent no-ops, so they are safe to call
 * in any environment.
 */

export interface PerformanceTrace {
  stop(): void;
  putAttribute(key: string, value: string): void;
  putMetric(key: string, value: number): void;
}

export interface PerformanceProvider {
  startTrace(name: string): PerformanceTrace;
}

const PROVIDER_KEY = "__mohasinac_perf_provider__" as const;

declare global {
  // eslint-disable-next-line no-var
  var __mohasinac_perf_provider__: PerformanceProvider | undefined;
}

/** Register a concrete performance backend (call once in instrumentation). */
export function setPerformanceProvider(provider: PerformanceProvider): void {
  (globalThis as Record<string, unknown>)[PROVIDER_KEY] = provider;
}

function getProvider(): PerformanceProvider | undefined {
  return globalThis.__mohasinac_perf_provider__;
}

/** Start a named trace. Returns `null` when no provider is registered. */
export function startTrace(name: string): PerformanceTrace | null {
  return getProvider()?.startTrace(name) ?? null;
}

/** Stop a trace returned by `startTrace`. Safe to call with `null`. */
export function stopTrace(t: PerformanceTrace | null): void {
  t?.stop();
}

/** Attach a string attribute to a trace. Safe to call with `null`. */
export function addTraceAttribute(
  t: PerformanceTrace | null,
  key: string,
  value: string,
): void {
  t?.putAttribute(key, value);
}

/** Record a numeric metric on a trace. Safe to call with `null`. */
export function addTraceMetric(
  t: PerformanceTrace | null,
  key: string,
  value: number,
): void {
  t?.putMetric(key, value);
}
