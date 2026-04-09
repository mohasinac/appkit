/**
 * @mohasinac/instrumentation
 *
 * Minimal Next.js instrumentation hook factory.
 *
 * ## What belongs HERE (in Next.js instrumentation)
 *
 *   - Provider/DI registration via registerProviders() — this MUST run before
 *     any API route handler calls getProviders().
 *
 * ## What belongs in Firebase Functions instead of Next.js instrumentation
 *
 *   On Vercel Hobby (free) tier, each serverless function invocation is billed
 *   and cold-start time is limited. Heavy observability setup should live in
 *   Firebase Functions (free tier: 2 M invocations/month, 400 K GB-seconds):
 *
 *   - APM / OpenTelemetry tracing — use a Firebase scheduled function to poll
 *     or process trace data asynchronously.
 *   - Error alerting / log aggregation — use Firestore triggers or scheduled
 *     jobs in functions/src/ (already present in this project).
 *   - Health checks / uptime monitoring — Firebase scheduled function pinging
 *     an internal pub/sub or writing to Firestore.
 *   - Performance budget checks — scheduled Firebase function reading Cloud
 *     Run metrics and writing summaries to Firestore.
 *
 * ## Usage (in app root instrumentation.ts)
 *
 * ```ts
 * import { createInstrumentation } from "@mohasinac/instrumentation";
 *
 * const { register } = createInstrumentation({
 *   onNodeServer: async () => {
 *     await import("./src/providers.config");
 *   },
 * });
 *
 * export { register };
 * ```
 */

export interface InstrumentationConfig {
  /**
   * Called ONCE when the Node.js runtime initialises (never on Edge runtime).
   * Use this to register providers and do any one-time server setup that must
   * complete before the first API route handler runs.
   *
   * Keep this function fast (< 50 ms). Any slow I/O, monitoring agents, or
   * APM SDKs should live in Firebase Functions instead.
   */
  onNodeServer: () => Promise<void>;
}

export interface InstrumentationHook {
  /**
   * The `register` export required by Next.js instrumentation.ts.
   * Next.js calls this exactly once per server process start.
   */
  register: () => Promise<void>;
}

/**
 * Creates a Next.js-compatible instrumentation hook.
 *
 * The returned `register` function is a no-op on the Edge runtime and calls
 * `onNodeServer` exactly once on the Node.js runtime.
 */
export function createInstrumentation(
  config: InstrumentationConfig,
): InstrumentationHook {
  return {
    register: async () => {
      // Skip on Edge — providers use Node.js APIs (firebase-admin, etc.)
      if (process.env.NEXT_RUNTIME === "edge") return;
      await config.onNodeServer();
    },
  };
}
