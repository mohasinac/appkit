import { normalizeError } from "../../errors/normalize";
/**
 * createRouteHandler — provider-aware API route handler factory for feat-* packages.
 *
 * Owns:
 *  - Auth (session cookie verify via the registered ISessionProvider).
 *  - Role + permission gates (admin bypass; employee fine-grained via rbac provider).
 *  - Body parsing (strict JSON; Zod safe-parse when schema is provided).
 *  - Default public Cache-Control on unauthenticated GET success responses.
 *  - The uniform error envelope `{ ok, code, error, issues?, requestId }`.
 *  - Persisted server-error log (writes 5xx + selected 4xx to `serverErrors`).
 *
 * Body parsing rules (workstream 1):
 *  - With `schema`: body is parsed and safe-parsed once; failure → 400 VALIDATION_FAILED.
 *  - Without `schema`, default behavior is "no body expected". Set `bodyOptional: true`
 *    to opt into accepting an empty body for PATCH/DELETE without content. Use
 *    `bodyRequired: true` to demand a body (raw JSON parse error → 400).
 *  - The `.catch(() => ({}))` pattern in callers is BANNED. The wrapper handles
 *    parse errors uniformly so callers receive a parsed value or never reach the handler.
 *
 * @example
 * ```ts
 * export const POST = createRouteHandler({
 *   auth: true,
 *   roles: ["admin"],
 *   schema: mySchema,
 *   handler: async ({ user, body }) => { ... },
 * });
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../contracts";
import { isAdminUser } from "../../features/auth/role-predicates";
import { mapToHttpError, HTTP_ERROR_CODES } from "../../errors/error-mapping";
import { serverErrorsRepository } from "../../features/server-errors/repository/server-errors.repository";
import { SCHEMAS } from "../../schemas/registry";
import type { RegisteredApiRouteKey } from "../../schemas/registry";
import type { ApiRouteKey, FirestoreValue } from "../../schemas/types";

/** Minimal schema interface compatible with Zod v3 and v4. */
interface ParseableSchema<TOutput> {
  safeParse(
    data: unknown,
  ):
    | { success: true; data: TOutput }
    | { success: false; error: { issues?: unknown[] } };
}

export interface RouteUser {
  uid: string;
  email?: string | null;
  displayName?: string;
  name?: string | null;
  role?: string;
  [key: string]: FirestoreValue;
}

interface RouteHandlerOptions<
  TInput = unknown,
  TParams = Record<string, string>,
> {
  auth?: boolean;
  authOptional?: boolean;
  roles?: readonly string[];
  permission?: string;
  /**
   * Body validator. Accepts either:
   *  - A Zod-compatible schema with `safeParse` (existing usage)
   *  - A registered API route key like `"POST /api/wishlist"` — the helper
   *    looks up `SCHEMAS.api[key].body` from the central registry (W4).
   *    Keys must be registered in `appkit/src/schemas/registry.ts`.
   *
   * When a key is used, the parsed body is still typed via TInput; provide
   * the inferred type as the generic for end-to-end safety.
   */
  schema?: ParseableSchema<TInput> | ApiRouteKey;
  /**
   * When `true`, the wrapper allows requests with no body or empty/malformed body
   * to reach the handler (body will be `undefined`). Only valid when `schema` is
   * not set. The default is "no body parsing attempted" — handlers that need a body
   * MUST use `schema`. This option exists for genuine no-content PATCH/DELETE routes.
   */
  bodyOptional?: boolean;
  /**
   * When `true`, requires a parseable JSON body even without a schema. Raw JSON
   * parse failure → 400 VALIDATION_FAILED. Mutually exclusive with `bodyOptional`.
   * Useful for routes that accept arbitrary JSON forwarded to a downstream service.
   */
  bodyRequired?: boolean;
  cache?:
    | false
    | {
        maxAge?: number;
        sMaxAge?: number;
        staleWhileRevalidate?: number;
      };
  handler: (ctx: {
    request: Request;
    user?: RouteUser;
    body?: TInput;
    params?: TParams;
    requestId: string;
  }) => Promise<Response>;
}

function buildPublicCacheControl(policy?: {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
}): string {
  const maxAge = policy?.maxAge ?? 30;
  const sMaxAge = policy?.sMaxAge ?? 300;
  const staleWhileRevalidate = policy?.staleWhileRevalidate ?? 600;
  return `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
}

function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function verifySession(request: Request): Promise<RouteUser> {
  const { session } = getProviders();
  if (!session) {
    throw Object.assign(new Error("Session provider not configured"), {
      status: 503,
    });
  }
  const cookie = readSessionCookie(request);
  if (!cookie) {
    throw Object.assign(new Error("Authentication required"), { status: 401 });
  }
  try {
    const payload = await session.verifySession(cookie);
    return {
      uid: payload.uid,
      email: payload.email,
      role: payload.role,
      emailVerified: payload.emailVerified,
      ...payload.claims,
    };
  } catch {
    throw Object.assign(new Error("Invalid or expired session"), {
      status: 401,
    });
  }
}

/** RFC4122-ish v4 ID without taking a dep on the runtime crypto module. */
function generateRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for older runtimes — short random hex
  return `req_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Persisted-log codes that warrant a serverErrors row even when status < 500. */
const LOG_AS_INCIDENT_CODES = new Set<string>([
  HTTP_ERROR_CODES.INTERNAL,
  HTTP_ERROR_CODES.UPSTREAM_UNAVAILABLE,
  HTTP_ERROR_CODES.CONCURRENT_MODIFICATION,
  HTTP_ERROR_CODES.PRECONDITION_FAILED,
  HTTP_ERROR_CODES.UNAVAILABLE,
  HTTP_ERROR_CODES.PAYMENT_ROLLBACK_ATTEMPTED,
  HTTP_ERROR_CODES.PAYMENT_ROLLBACK_FAILED,
]);

function shouldPersist(status: number, code: string): boolean {
  if (status >= 500) return true;
  return LOG_AS_INCIDENT_CODES.has(code);
}

/**
 * Resolve the body schema for a createRouteHandler call. Accepts either a
 * direct ParseableSchema or a registered ApiRouteKey string; returns the
 * resolved schema, or null when the key isn't registered / has no `body`.
 * Pulls the registry lookup out of the request hot path so the body parsing
 * branch in createRouteHandler stays flat (audit-code-quality:DEEP_NESTING).
 */
function resolveBodySchema<T>(
  schema: ParseableSchema<T> | ApiRouteKey,
): ParseableSchema<T> | null {
  if (typeof schema !== "string") return schema;
  const entry = SCHEMAS.api[schema as RegisteredApiRouteKey];
  if (!entry || !("body" in entry) || !entry.body) return null;
  // audit-unknown-ok: TS structural escape — ParseableSchema
  return entry.body as unknown as ParseableSchema<T>;
}

/**
 * Emit a uniform error envelope. Currently emits BOTH `ok` (new canonical) and
 * `success` (deprecated, kept until the 211-fetch sweep finishes) so consumers
 * that still read `body.success` don't break mid-migration. The
 * audit-server-action-envelope.mjs script in workstream 6 will fail CI as
 * soon as every consumer is updated, after which `success` is removed from
 * this helper and the audit re-runs to enforce the cleanup.
 */
function errorJson(
  status: number,
  code: string,
  message: string,
  requestId: string,
  issues?: unknown[],
): Response {
  return NextResponse.json(
    {
      ok: false,
      success: false, // deprecated — for compat during the migration sweep
      code,
      error: message,
      ...(issues ? { issues } : {}),
      requestId,
    },
    { status, headers: { "X-Request-Id": requestId } },
  );
}

export function createRouteHandler<
  TInput = unknown,
  TParams = Record<string, string>,
>(options: RouteHandlerOptions<TInput, TParams>) {
  if (options.bodyOptional && options.bodyRequired) {
    throw new Error(
      "createRouteHandler: bodyOptional and bodyRequired are mutually exclusive",
    );
  }
  if (options.schema && options.bodyOptional) {
    throw new Error(
      "createRouteHandler: bodyOptional is invalid when schema is set (schema is always required)",
    );
  }

  return async (
    request: Request,
    context: { params: Promise<TParams> },
  ): Promise<Response> => {
    const requestId = generateRequestId();
    let user: RouteUser | undefined;

    try {
      // -- Auth --------------------------------------------------------------
      const needsAuth =
        options.auth ||
        (options.roles && options.roles.length > 0) ||
        !!options.permission;

      if (needsAuth) {
        user = await verifySession(request);
      } else if (options.authOptional) {
        try {
          user = await verifySession(request);
        } catch {
          // anonymous
        }
      }

      // -- Role check --------------------------------------------------------
      const effectiveRoles = options.roles
        ? options.permission
          ? [...new Set([...options.roles, "employee"])]
          : options.roles
        : options.permission
          ? ["admin", "employee"]
          : [];

      if (effectiveRoles.length > 0) {
        if (!user || !effectiveRoles.includes(user.role ?? "")) {
          return errorJson(403, HTTP_ERROR_CODES.FORBIDDEN, "Insufficient permissions", requestId);
        }
      }

      // -- Permission check (employee fine-grained) --------------------------
      if (options.permission && user && !isAdminUser(user)) {
        const { rbac } = getProviders();
        if (!rbac) {
          return errorJson(503, HTTP_ERROR_CODES.UNAVAILABLE, "RBAC provider not configured", requestId);
        }
        const perms = await rbac.getPermissions(user.uid);
        if (!perms.includes(options.permission)) {
          return errorJson(403, HTTP_ERROR_CODES.PERMISSION_DENIED, "Insufficient permissions", requestId);
        }
      }

      // -- Body parsing ------------------------------------------------------
      let body: TInput | undefined;
      const resolvedSchema = options.schema
        ? resolveBodySchema<TInput>(options.schema)
        : undefined;
      if (options.schema && !resolvedSchema) {
        return errorJson(
          500,
          HTTP_ERROR_CODES.INTERNAL,
          `Route schema not registered: ${String(options.schema)}`,
          requestId,
        );
      }
      if (resolvedSchema) {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return errorJson(400, HTTP_ERROR_CODES.VALIDATION_FAILED, "Invalid JSON body", requestId);
        }
        const result = resolvedSchema.safeParse(raw);
        if (!result.success) {
          return errorJson(
            400,
            HTTP_ERROR_CODES.VALIDATION_FAILED,
            "Validation failed",
            requestId,
            result.error.issues ?? [],
          );
        }
        body = result.data;
      } else if (options.bodyRequired) {
        try {
          body = (await request.json()) as TInput;
        } catch {
          return errorJson(400, HTTP_ERROR_CODES.VALIDATION_FAILED, "Invalid JSON body", requestId);
        }
      } else if (options.bodyOptional) {
        // Best-effort parse; tolerate empty/malformed body.
        try {
          const text = await request.text();
          body = text ? (JSON.parse(text) as TInput) : undefined;
        } catch {
          body = undefined;
        }
      }

      // -- Params + handler --------------------------------------------------
      const params = context?.params ? await context.params : undefined;

      const response = await options.handler({
        request,
        user,
        body,
        params: params as TParams | undefined,
        requestId,
      });

      // Always tag the response with the request id for traceability.
      response.headers.set("X-Request-Id", requestId);

      // -- Default public cache (unauth GET success) -------------------------
      const hasCredentialHeaders =
        !!request.headers.get("authorization") ||
        !!request.headers.get("cookie");
      const canApplyDefaultPublicCache =
        request.method === "GET" &&
        !needsAuth &&
        options.cache !== false &&
        !hasCredentialHeaders &&
        response.status >= 200 &&
        response.status < 300 &&
        !response.headers.has("Cache-Control");

      if (canApplyDefaultPublicCache) {
        const policy =
          typeof options.cache === "object" ? options.cache : undefined;
        response.headers.set(
          "Cache-Control",
          buildPublicCacheControl(policy),
        );
      }

      return response;
    } catch (err: unknown) {
      void normalizeError(err);
      const mapped = mapToHttpError(err, {
        isProduction: process.env.NODE_ENV === "production",
      });

      // -- Persisted log (5xx + selected 4xx) --------------------------------
      if (shouldPersist(mapped.status, mapped.code)) {
        void serverErrorsRepository().record({
          source: "vercel",
          route: new URL(request.url).pathname,
          method: request.method,
          ...(user?.uid ? { userId: user.uid } : {}),
          code: mapped.code,
          message: mapped.message,
          stack: err instanceof Error ? err.stack : undefined,
          requestId,
          userAgent: request.headers.get("user-agent") ?? undefined,
        });
      }

      // -- console-side surface ---------------------------------------------
      if (mapped.status >= 500) {
        // eslint-disable-next-line no-console
        console.error(
          `[createRouteHandler] ${request.method} ${new URL(request.url).pathname} failed [${requestId}]`,
          err,
        );
      } else if (mapped.status >= 400 && mapped.status !== 401 && mapped.status !== 403) {
        // eslint-disable-next-line no-console
        console.warn(
          `[createRouteHandler] ${request.method} ${new URL(request.url).pathname} failed (${mapped.status}) [${requestId}]`,
          mapped.code,
          mapped.message,
        );
      }

      return errorJson(mapped.status, mapped.code, mapped.message, requestId, mapped.issues);
    }
  };
}
