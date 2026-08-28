import { normalizeError } from "./normalize";
/**
 * Flatten an `Error.cause` chain into a single persistable string.
 *
 * WHY THIS EXISTS
 *   Every `AppError` in this codebase is a WRAP — `new DatabaseError("Batch
 *   write failed: …", originalError)` — and `AppError` calls
 *   `Error.captureStackTrace(this, this.constructor)`, which rebases `.stack`
 *   onto the wrapping constructor. So the wrapper's own stack starts at the
 *   catch block that wrapped it, and the frames that actually name the fault
 *   live only on the cause.
 *
 *   Nothing used to read them. `JSON.stringify(new Error("boom"))` is `"{}"`,
 *   so the one logger path that tried (`buildServerMeta`) serialised the cause
 *   to an empty object, and the serverErrors schema had no field for it at all.
 *   The only reason the original message was ever readable was one call site
 *   interpolating it into its own message by hand.
 *
 * Depth-capped and byte-capped: a cause chain is untrusted in length, and this
 * value is persisted into a document that must stay inside the 4 KB stack
 * budget documented on `ServerErrorDocument`.
 */

const MAX_DEPTH = 5;
const MAX_BYTES = 4096;

/**
 * Whatever the standard library says a cause is.
 *
 * Written as `Error["cause"]` rather than a literal `unknown` on purpose: any
 * value can be thrown in JavaScript, so this is genuinely unnarrowable, and
 * deriving it from the lib keeps it correct if that ever changes.
 */
type ErrorCause = Error["cause"];

/** `cause` is only present on the ES2022 Error shape; read it structurally. */
function causeOf(value: object): ErrorCause {
  return (value as { cause?: ErrorCause }).cause;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err) ?? String(err);
    // JSON.stringify throws only on a circular/BigInt value; String() always
    // succeeds. This runs inside the error path, where throwing would lose the
    // original error we were trying to describe.
  } catch (stringifyErr) {
    void normalizeError(stringifyErr);
    return String(err);
  }
}

/**
 * @returns the flattened chain, or `undefined` when there is no cause — so the
 * caller can omit the Firestore field entirely rather than writing `""`.
 */
export function describeCauseChain(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;

  const parts: string[] = [];
  const seen = new Set<ErrorCause>([err]);
  let current: ErrorCause = causeOf(err);
  let depth = 0;

  while (current !== undefined && current !== null && depth < MAX_DEPTH) {
    // A cause cycle is rare but cheap to guard, and an infinite loop here would
    // hang the error path — the one place that must never make things worse.
    if (seen.has(current)) {
      parts.push("caused by: <circular>");
      break;
    }
    seen.add(current);

    const head = messageOf(current);
    const stack = current instanceof Error ? current.stack : undefined;
    // Prefer the stack (it contains the message as its first line); fall back
    // to the message alone for non-Error causes.
    parts.push(`caused by: ${stack ?? head}`);

    current = typeof current === "object" ? causeOf(current) : undefined;
    depth++;
  }

  if (parts.length === 0) return undefined;

  const joined = parts.join("\n\n");
  return joined.length <= MAX_BYTES ? joined : joined.slice(0, MAX_BYTES);
}
