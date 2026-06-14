import { mapToHttpError } from "./error-mapping";

/**
 * Hook that downstream consumers (the persisted-log path) register so safeRead
 * can record degraded reads without taking a hard dependency on the repository.
 * Default is a no-op so calling safeRead before the reporter is installed
 * does not crash.
 */
export interface DegradedReadReport {
  route: string;
  key: string;
  code: string;
  message: string;
  stack?: string;
}

type DegradedReadReporter = (report: DegradedReadReport) => void | Promise<void>;

let reporter: DegradedReadReporter = () => {
  /* installed at server boot by the server-errors repository wiring */
};

export function installDegradedReadReporter(fn: DegradedReadReporter): void {
  reporter = fn;
}

interface SafeReadOptions<T> {
  /** Used as the `route` field on the persisted degraded-read entry. */
  route: string;
  /** Stable identifier for the read site (e.g. "homepage:hero-rail"). */
  key: string;
  /**
   * Typed fallback returned when the read fails. The intent of the original
   * silent catch is preserved — but the failure is no longer invisible.
   */
  fallback: T;
}

/**
 * Wrap an optional read whose failure must not break the surrounding page.
 *
 * Required-data reads should NOT use this — they should throw and be caught
 * by the route handler / server action envelope (mapToHttpError).
 *
 * On failure: persists a DEGRADED_READ row via the installed reporter and
 * returns `opts.fallback`. Never re-throws.
 */
export async function safeRead<T>(
  fn: () => Promise<T>,
  opts: SafeReadOptions<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const mapped = mapToHttpError(err);
    try {
      await reporter({
        route: opts.route,
        key: opts.key,
        code: "DEGRADED_READ",
        message: mapped.message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    } catch {
      // reporter itself must never propagate; safeRead is a safety net.
    }
    return opts.fallback;
  }
}
