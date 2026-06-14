// [SERVER-OR-CLIENT] Catch-clause normalizer (W3).
//
// Every `catch (e: unknown)` in the codebase funnels through `normalizeError`
// to convert the unknown thrown value into a typed `NormalizedError`
// discriminated union. After the call, the catch site never holds `unknown`
// — every branch is type-safe.
//
// `audit-catch-normalize.mjs` enforces that every catch block calls
// `normalizeError(e)` (or returns/throws) on its first non-comment statement.
//
// Naming note: appkit already has a class named `AppError` exported from
// `./base-error`. We use `NormalizedError` here to avoid conflict; both
// represent the same intent (typed error envelope) but `AppError` is a
// throwable class while `NormalizedError` is the result of catching one.

import { ZodError } from "zod";
import { ApiError } from "../client/api/ApiError";
import { AppError } from "./base-error";

// ---------------------------------------------------------------------------
// NormalizedError discriminated union — `kind` is the discriminator.
// ---------------------------------------------------------------------------

export interface NormalizedZodError {
  readonly kind: "zod";
  readonly code: "VALIDATION_FAILED";
  readonly message: string;
  readonly issues: ReadonlyArray<{
    readonly path: ReadonlyArray<string | number>;
    readonly code: string;
    readonly message: string;
  }>;
  readonly cause: ZodError;
}

export interface NormalizedApiError {
  readonly kind: "api";
  readonly code: string;
  readonly status: number;
  readonly message: string;
  readonly issues?: ReadonlyArray<unknown>;
  readonly requestId?: string;
  readonly cause: ApiError;
}

export interface NormalizedAppError {
  readonly kind: "app";
  readonly code: string;
  readonly status: number;
  readonly message: string;
  readonly data?: unknown;
  readonly cause: AppError;
}

export interface NormalizedFirebaseAuthError {
  readonly kind: "firebase-auth";
  readonly code: string;       // e.g. "auth/user-not-found"
  readonly message: string;
  readonly cause: Error;
}

export interface NormalizedFirebaseFirestoreError {
  readonly kind: "firebase-firestore";
  readonly code: string;       // e.g. "permission-denied"
  readonly message: string;
  readonly cause: Error;
}

export interface NormalizedFirebaseStorageError {
  readonly kind: "firebase-storage";
  readonly code: string;       // e.g. "storage/object-not-found"
  readonly message: string;
  readonly cause: Error;
}

export interface NormalizedNetworkError {
  readonly kind: "network";
  readonly code: "NETWORK_FAILURE";
  readonly message: string;
  readonly cause: Error;
}

export interface NormalizedNativeError {
  readonly kind: "native";
  readonly code: string;       // Error.name or "UNKNOWN_ERROR"
  readonly message: string;
  readonly stack?: string;
  readonly cause: Error;
}

export interface NormalizedUnknownThrownValue {
  readonly kind: "unknown";
  readonly code: "UNKNOWN_THROWN_VALUE";
  readonly message: string;    // String(value)
  readonly value: string;
}

export type NormalizedError =
  | NormalizedZodError
  | NormalizedApiError
  | NormalizedAppError
  | NormalizedFirebaseAuthError
  | NormalizedFirebaseFirestoreError
  | NormalizedFirebaseStorageError
  | NormalizedNetworkError
  | NormalizedNativeError
  | NormalizedUnknownThrownValue;

// ---------------------------------------------------------------------------
// Type guards on the discriminator.
// ---------------------------------------------------------------------------

export const isZodNormalized = (e: NormalizedError): e is NormalizedZodError => e.kind === "zod";
export const isApiNormalized = (e: NormalizedError): e is NormalizedApiError => e.kind === "api";
export const isAppNormalized = (e: NormalizedError): e is NormalizedAppError => e.kind === "app";
export const isFirebaseAuthNormalized = (e: NormalizedError): e is NormalizedFirebaseAuthError =>
  e.kind === "firebase-auth";
export const isFirebaseFirestoreNormalized = (e: NormalizedError): e is NormalizedFirebaseFirestoreError =>
  e.kind === "firebase-firestore";
export const isFirebaseStorageNormalized = (e: NormalizedError): e is NormalizedFirebaseStorageError =>
  e.kind === "firebase-storage";
export const isNetworkNormalized = (e: NormalizedError): e is NormalizedNetworkError => e.kind === "network";
export const isNativeNormalized = (e: NormalizedError): e is NormalizedNativeError => e.kind === "native";
export const isUnknownNormalized = (e: NormalizedError): e is NormalizedUnknownThrownValue => e.kind === "unknown";

// ---------------------------------------------------------------------------
// Probes — narrow heuristics for upstream library shapes.
// ---------------------------------------------------------------------------

function hasStringProp<K extends string>(value: unknown, key: K): value is Record<K, string> {
  return typeof value === "object" && value !== null && typeof (value as Record<string, unknown>)[key] === "string";
}

type CodedError = Error & { code: string };

function isFirebaseAuthErrorShape(e: Error): e is CodedError {
  if (!hasStringProp(e, "code")) return false;
  return (e as unknown as CodedError).code.startsWith("auth/");
}

function isFirebaseStorageErrorShape(e: Error): e is CodedError {
  if (!hasStringProp(e, "code")) return false;
  return (e as unknown as CodedError).code.startsWith("storage/");
}

function isFirebaseFirestoreErrorShape(e: Error): e is CodedError {
  if (!hasStringProp(e, "code")) return false;
  const code = (e as unknown as CodedError).code;
  // Firestore codes are bare strings: "permission-denied", "not-found", etc.
  return (
    /^[a-z-]+$/.test(code) &&
    [
      "cancelled",
      "unknown",
      "invalid-argument",
      "deadline-exceeded",
      "not-found",
      "already-exists",
      "permission-denied",
      "resource-exhausted",
      "failed-precondition",
      "aborted",
      "out-of-range",
      "unimplemented",
      "internal",
      "unavailable",
      "data-loss",
      "unauthenticated",
    ].includes(code)
  );
}

function isNetworkErrorShape(e: Error): boolean {
  // The browser fetch API throws `TypeError("Failed to fetch")` on network
  // failure. Node's `undici` throws `TypeError("fetch failed")`.
  return (
    e.name === "TypeError" &&
    (e.message.toLowerCase().includes("fetch") || e.message.toLowerCase().includes("network"))
  );
}

// ---------------------------------------------------------------------------
// normalizeError — the single funnel for every `catch (e: unknown)`.
// ---------------------------------------------------------------------------

export function normalizeError(e: unknown): NormalizedError {
  // ApiError (client-side API failure with stable code + status).
  if (e instanceof ApiError) {
    return {
      kind: "api",
      code: e.code,
      status: e.status,
      message: e.message,
      issues: e.issues,
      requestId: e.requestId,
      cause: e,
    };
  }

  // AppError (server-side throwable with status + code).
  if (e instanceof AppError) {
    return {
      kind: "app",
      code: e.code,
      status: e.statusCode,
      message: e.message,
      data: e.data,
      cause: e,
    };
  }

  // Zod validation failures.
  if (e instanceof ZodError) {
    return {
      kind: "zod",
      code: "VALIDATION_FAILED",
      message: e.message,
      issues: e.issues.map((i) => ({
        path: i.path,
        code: i.code,
        message: i.message,
      })),
      cause: e,
    };
  }

  // Native Error subclasses — probe for Firebase / network before falling
  // through to generic "native".
  if (e instanceof Error) {
    if (isFirebaseAuthErrorShape(e)) {
      return {
        kind: "firebase-auth",
        code: e.code,
        message: e.message,
        cause: e,
      };
    }
    if (isFirebaseStorageErrorShape(e)) {
      return {
        kind: "firebase-storage",
        code: e.code,
        message: e.message,
        cause: e,
      };
    }
    if (isFirebaseFirestoreErrorShape(e)) {
      return {
        kind: "firebase-firestore",
        code: e.code,
        message: e.message,
        cause: e,
      };
    }
    if (isNetworkErrorShape(e)) {
      return {
        kind: "network",
        code: "NETWORK_FAILURE",
        message: e.message,
        cause: e,
      };
    }
    return {
      kind: "native",
      code: e.name || "UNKNOWN_ERROR",
      message: e.message,
      stack: e.stack,
      cause: e,
    };
  }

  // Non-Error thrown value — last resort.
  const value = String(e);
  return {
    kind: "unknown",
    code: "UNKNOWN_THROWN_VALUE",
    message: value,
    value,
  };
}

// ---------------------------------------------------------------------------
// getErrorMessage — convenience for catch sites that just want a string.
// Always prefer `normalizeError(e).message` for new code; this is a tiny
// shortcut for legacy migrations.
// ---------------------------------------------------------------------------

export function getErrorMessage(e: unknown): string {
  return normalizeError(e).message;
}

// ---------------------------------------------------------------------------
// isAuthError — replacement for the legacy `appkit/src/utils/auth-error.ts`
// keyword matcher. Uses the normalized error to decide if the failure is
// an auth/authorization failure (401, 403, Firebase auth/*, or `kind: "api"`
// with status 401/403).
// ---------------------------------------------------------------------------

export function isAuthError(e: unknown, httpStatus?: number): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  const ne = normalizeError(e);
  if (ne.kind === "api" && (ne.status === 401 || ne.status === 403)) return true;
  if (ne.kind === "app" && (ne.status === 401 || ne.status === 403)) return true;
  if (ne.kind === "firebase-auth") return true;
  // Keyword fallback retained for legacy server-side string errors. To be
  // removed once all server actions throw typed errors.
  const msg = ne.message.toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("not authenticated") ||
    msg.includes("unauthenticated") ||
    msg.includes("authentication required") ||
    msg.includes("invalid or expired session")
  );
}
