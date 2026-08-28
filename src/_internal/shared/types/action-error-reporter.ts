import { normalizeError } from "../../../errors/normalize";
/**
 * Registration seam for recording server-action failures.
 *
 * WHY A HOOK AND NOT A DIRECT IMPORT
 *   `wrapAction` lives in `_internal/shared/`, and the module that hosts it also
 *   exports `isOk` / `unwrap` — type guards that CLIENT components import. A
 *   static `serverErrorsRepository` import there would drag `firebase-admin`
 *   into the client bundle graph, which is exactly the Turbopack trap in
 *   CLAUDE.md Root Cause #6. So the recorder is injected from the server side
 *   instead, and this module stays dependency-free.
 *
 * WHERE IT IS REGISTERED
 *   `src/instrumentation.ts` — server-only and guaranteed to be loaded by
 *   Next.js. Deliberately NOT a client bootstrap component: `setErrorTracker`
 *   was registered that way, the component it lived in was orphaned during a
 *   refactor, and every error boundary silently lost its digest for months
 *   (CLAUDE.md Root Cause #78). A registration nothing imports is invisible to
 *   `tsc`, so `audit-observability-registration.mjs` asserts both hooks keep a
 *   reachable call site.
 */

export interface ActionErrorReport {
  /** Stable error code from the mapped envelope. */
  code: string;
  /** The UNSCRUBBED message — never the client-facing one. */
  message: string;
  /** Wrapper stack. Begins at the wrap site; see `cause`. */
  stack?: string;
  /** Flattened `Error.cause` chain — where the real frames live. */
  cause?: string;
}

export type ActionErrorReporter = (report: ActionErrorReport) => void;

let reporter: ActionErrorReporter | null = null;

export function setActionErrorReporter(fn: ActionErrorReporter): void {
  reporter = fn;
}

/**
 * Report a server-action failure. Never throws and never awaits — the caller is
 * already on a failure path and must not be made slower or more fragile by
 * observability.
 */
export function reportActionError(report: ActionErrorReport): void {
  if (!reporter) return;
  try {
    reporter(report);
    // This IS the error-reporting path. A reporter that throws must not turn a
    // handled action failure into an unhandled one, and there is nowhere left
    // to escalate to — the thing that would have reported it is what failed.
  } catch (reporterErr) {
    void normalizeError(reporterErr);
  }
}

/** Test/introspection helper — true once a reporter has been installed. */
export function hasActionErrorReporter(): boolean {
  return reporter !== null;
}
