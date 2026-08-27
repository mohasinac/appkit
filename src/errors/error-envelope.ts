/**
 * The ONE shape of an HTTP error body.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * There were four independent producers of an error response, and the client
 * read a shape none of them fully emitted:
 *
 *   - `next/api/api-response.ts`  → `{success, error, details}`  — no `code`
 *   - `next/api/routeHandler.ts`  → `{ok, success, code, error, issues, requestId}`
 *   - `errors/error-handler.ts`   → `{..., data: {issues}}`      — issues nested
 *   - `core/server-action.ts`     → `{ok, error, fieldErrors}`
 *
 * while `http/ApiClient.ts`'s `ApiClientError` reads exactly three keys off the
 * body: `code`, `issues`, `requestId`.
 *
 * The consequence was silent and app-wide. On every route built with
 * `createApiHandler`, a Zod rejection serialised its issues under `details`,
 * which nothing reads — so `err.code` was `undefined`, `surfaceError`'s
 * `hasStableErrorCode()` check failed, the `ERROR_DISPLAY_MAP` branch was
 * skipped, and the user got a bare toast reading "Validation failed" with no
 * field name. `applyZodIssues(err.issues, …)` was dead code everywhere.
 *
 * Every producer now builds its body here, so the wire shape and the reader
 * cannot drift again. `scripts/audit-api-error-envelope.mjs` enforces it in
 * both directions.
 */

import type { ApiIssue } from "../client/api/ApiError";
import { HTTP_ERROR_CODES } from "./error-mapping";

export interface ApiErrorEnvelope {
  ok: false;
  /**
   * @deprecated Mirrors `ok` for consumers that still read `body.success`.
   * `audit-server-action-envelope.mjs` is designed to start failing once the
   * last reader is gone, at which point this key is removed.
   */
  success: false;
  code: string;
  error: string;
  issues?: ApiIssue[];
  requestId?: string;
}

/**
 * Default stable code for an HTTP status, for producers that don't carry one.
 *
 * Mirrors the mapping already applied in `mapToHttpError`'s status branch —
 * extracted so there is one table rather than two that can disagree about
 * what a 409 is called.
 */
export function codeForStatus(status: number): string {
  if (status === 401) return HTTP_ERROR_CODES.UNAUTHENTICATED;
  if (status === 403) return HTTP_ERROR_CODES.FORBIDDEN;
  if (status === 404) return HTTP_ERROR_CODES.NOT_FOUND;
  if (status === 409) return HTTP_ERROR_CODES.ALREADY_EXISTS;
  if (status === 429) return HTTP_ERROR_CODES.RATE_LIMITED;
  if (status >= 500) return HTTP_ERROR_CODES.INTERNAL;
  return HTTP_ERROR_CODES.VALIDATION_FAILED;
}

/**
 * The overlap of a zod-v3 `ZodIssue` and a zod-v4 `$ZodIssue` — the only three
 * fields this layer reads, declared structurally so neither Zod major has to
 * be imported here.
 */
interface RawIssueLike {
  path?: readonly (string | number)[];
  message?: string;
  code?: string;
}

/**
 * Narrow raw Zod issues to the wire shape.
 *
 * Deliberately picks ONLY `path`, `message` and `code`. A `ZodIssue` can also
 * carry `received` / `expected` / `unionErrors`, and `received` is the value
 * the user actually submitted — i.e. potentially their email, phone or
 * address. Spreading the issue wholesale would publish that in an error body
 * and into any client-error log that captures it.
 *
 * The `unknown` parameter is the point: this is the sole entry point for issue
 * arrays arriving from THREE mutually unassignable sources — zod v3
 * `ZodIssue[]` (appkit), zod v4 `$ZodIssue[]` (the consumer app, a different
 * major), and the `unknown[]` that `mapToHttpError` already returns. Narrowing
 * it to any one of them makes the other two uncallable. This function exists
 * precisely to be the place that narrows.
 */
export function toApiIssues(input: unknown): ApiIssue[] | undefined {
  if (!Array.isArray(input) || input.length === 0) return undefined;
  const mapped: ApiIssue[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) continue;
    const issue = raw as RawIssueLike;
    if (typeof issue.message !== "string") continue;
    mapped.push({
      message: issue.message,
      ...(Array.isArray(issue.path)
        ? { path: issue.path.filter((p): p is string | number =>
            typeof p === "string" || typeof p === "number") }
        : {}),
      ...(typeof issue.code === "string" ? { code: issue.code } : {}),
    });
  }
  return mapped.length ? mapped : undefined;
}

export function buildErrorEnvelope(input: {
  message: string;
  status?: number;
  code?: string;
  issues?: ApiIssue[];
  requestId?: string;
}): ApiErrorEnvelope {
  return {
    ok: false,
    success: false,
    code: input.code ?? codeForStatus(input.status ?? 400),
    error: input.message,
    ...(input.issues?.length ? { issues: input.issues } : {}),
    ...(input.requestId ? { requestId: input.requestId } : {}),
  };
}
