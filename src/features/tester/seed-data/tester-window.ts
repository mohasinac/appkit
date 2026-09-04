/*
 * WHY: Every time-bound tester fixture — auction end dates, coupon validity, event
 *      start/end, prize-draw reveal windows, offer expiry, lottery draw windows —
 *      must open and close INSIDE one testing session. Hand-written offsets like
 *      `Date.now() + 2 * 60 * 60 * 1000` cannot do that: they bake in a duration
 *      nobody can shorten, so a case reading "watch the auction actually end" is
 *      untestable without sitting there for two hours.
 *
 *      This file is the one knob. Fixtures express WHEN as a fraction of the run
 *      window; the window's real length comes from TESTER_WINDOW_MINUTES.
 *
 * WHAT: windowMinutes() / windowOffset(fraction) / windowAgo(fraction).
 *
 * 🛑 The default is 180 minutes ON PURPOSE — it reproduces the pre-existing 1h/2h/3h
 *    auction stagger exactly (fractions 1/3, 2/3, 1), so an ordinary `appkit-seed load`
 *    behaves as it always has. Only the automated runner shortens it. Changing this
 *    default silently re-times every fixture for human testers too.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/*-tester-seed-data.ts
 * @tag sideEffects:none
 */

/** Reproduces the historical 1h/2h/3h auction stagger when nothing overrides it. */
export const DEFAULT_TESTER_WINDOW_MINUTES = 180;

/** Below this nothing is observable — a page load alone can outlast it. */
export const MIN_TESTER_WINDOW_MINUTES = 5;

/** The sandbox TTL is 7 days; a window longer than that outlives its own fixtures. */
export const MAX_TESTER_WINDOW_MINUTES = 7 * 24 * 60;

/**
 * Length of the testing window, in minutes.
 *
 * Read at call time rather than captured at module scope so a caller that sets the
 * env var before importing a seed file still wins. Anything unparseable, non-finite
 * or out of range falls back to the default rather than throwing: a malformed env
 * var must not be able to brick `appkit-seed load`.
 */
export function windowMinutes(): number {
  const raw = process.env.TESTER_WINDOW_MINUTES;
  if (!raw) return DEFAULT_TESTER_WINDOW_MINUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_TESTER_WINDOW_MINUTES;
  if (parsed < MIN_TESTER_WINDOW_MINUTES) return MIN_TESTER_WINDOW_MINUTES;
  if (parsed > MAX_TESTER_WINDOW_MINUTES) return MAX_TESTER_WINDOW_MINUTES;
  return parsed;
}

/**
 * A point `fraction` of the way through the window, measured from now.
 *
 * `windowOffset(0)` is now, `windowOffset(1)` is the window's end. Fractions above 1
 * are allowed and mean "after this run" — that is how a fixture says "still open when
 * testing finishes" without hard-coding a duration.
 */
export function windowOffset(fraction: number): Date {
  return new Date(Date.now() + fraction * windowMinutes() * 60_000);
}

/** The mirror of windowOffset, into the past — for fixtures that must already be closed. */
export function windowAgo(fraction: number): Date {
  return windowOffset(-fraction);
}
