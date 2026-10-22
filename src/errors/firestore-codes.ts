/**
 * Firestore / gRPC error-code predicates, in one place.
 *
 * ## Why this file exists
 *
 * `isAlreadyExists` had been written THREE times — in the gateway-events,
 * payment-cases and protection-claims repositories, two of them byte-identical
 * — and each copy duck-typed the caught error the same way:
 *
 *     const code = (err as { code?: unknown }).code;
 *
 * That is past the Rule of Three, and `audit-unknown-leakage` was reporting all
 * six of those field reads: casting to `{ code?: unknown }` narrows the OBJECT
 * and leaves the FIELD unknown, so every comparison below it is unchecked.
 * Naming the shape once gives the comparisons a real type and leaves one
 * implementation to fix when the SDK changes what it throws.
 *
 * ## 🛑 Why three checks and not one
 *
 * The Admin SDK has surfaced this condition as a numeric gRPC code, as a string
 * code, and as a bare message, depending on version and transport. All three
 * are tested, and the message test is in ADDITION to the codes rather than
 * instead of them — a stringly-typed guard alone is what breaks silently on an
 * SDK bump, and the failure mode is a create that reports success while having
 * collided.
 */

/** gRPC status 6. The numeric form, which is what the Admin SDK usually sets. */
export const GRPC_ALREADY_EXISTS = 6;

/**
 * The fields a thrown Firestore error may carry.
 *
 * Deliberately NOT `Record<string, unknown>`: `code` is a gRPC status or its
 * string spelling, and typing it as `unknown` would make every `===` below a
 * comparison against nothing. Both fields are optional because a thrown value
 * is not guaranteed to be an SDK error at all — that is what the `typeof`
 * guard in each predicate is for.
 */
interface FirestoreLikeError {
  code?: number | string;
  message?: string;
}

/** Narrow an unknown thrown value to the fields these predicates read. */
function asFirestoreError(err: unknown): FirestoreLikeError | null {
  if (typeof err !== "object" || err === null) return null;
  return err as FirestoreLikeError;
}

/**
 * Did Firestore refuse this write because the document already exists?
 *
 * The one question every `createWithId`-style insert needs answered, and the
 * reason it matters is that "already there" is usually SUCCESS for an
 * idempotent writer — a claim, a case or an inbox row that a retry re-sends.
 * Treating it as a failure turns a safe retry into a 500.
 */
export function isAlreadyExistsError(err: unknown): boolean {
  const e = asFirestoreError(err);
  if (!e) return false;
  if (e.code === GRPC_ALREADY_EXISTS) return true;
  if (e.code === "already-exists" || e.code === "ALREADY_EXISTS") return true;
  return typeof e.message === "string" && e.message.includes("ALREADY_EXISTS");
}
