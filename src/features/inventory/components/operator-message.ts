/**
 * A failed inventory write, as something an operator can act on.
 *
 * 🛑 THIS EXISTS BECAUSE `toUserMessage(undefined, undefined, { fallback })`
 * IS THE `?? error` ANTI-PATTERN. Passing `undefined` for the code means the
 * mapping never runs and the server's own message is always what shows — which
 * is precisely the bug Rule #9 records: an unmapped failure printed server
 * internals to the user, and a Node `MODULE_NOT_FOUND` with a require stack was
 * rendered inside a modal. I wrote that call before noticing.
 *
 * But the inventory screens genuinely need the server's words for the 4xx
 * cases, and that is not a contradiction. "AC60-03 is retired", "holds 2,
 * cannot move 5" and "duplicate box code" are messages written FOR the
 * operator, naming the box and the count, and they tell them what to do next.
 * `GENERIC_USER_MESSAGE` in their place turns a recoverable mistake into a
 * mystery at a station where someone is holding the physical item.
 *
 * So the rule is split on STATUS, which is the thing that actually
 * distinguishes the two:
 *
 * · 4xx — deliberate, authored, operator-facing. Show it.
 * · 5xx (and anything with no status) — unplanned. Route through the code map,
 *   which terminates in a constant and never returns server text. `mapToHttpError`
 *   also scrubs 5xx messages in production, so the server text may well already
 *   be generic by the time it arrives — but relying on that would make this
 *   correct only in production, and the station is also used against a local
 *   server.
 */

import { toUserMessage } from "../../../errors/error-display-map";

/*
 * The three fields this reads, TYPED rather than `unknown`.
 *
 * They were `unknown`, which narrows the object and leaves every field
 * unchecked — so `status >= 400` below compared against nothing, and
 * audit-unknown-leakage reported all three. Each one has exactly one real
 * shape: an HTTP status is a number, an error code and a message are strings.
 * Both `ApiError` and the api/app branches of `NormalizedError` match this,
 * which is what every caller now passes.
 */
interface MaybeApiError {
  status?: number;
  code?: string;
  message?: string;
}

export function operatorMessage(
  err: unknown,
  t?: (key: string) => string,
): string {
  const e = (err ?? {}) as MaybeApiError;
  const status = typeof e.status === "number" ? e.status : undefined;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : undefined;

  if (status !== undefined && status >= 400 && status < 500 && message) {
    return message;
  }
  // No fallback argument: the point is that this branch must NOT reach the
  // server's text. `toUserMessage` ends at `errors.codes.UNKNOWN`.
  return toUserMessage(code, t);
}
