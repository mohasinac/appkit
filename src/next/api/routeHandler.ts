/**
 * createRouteHandler — provider-aware API route handler factory for feat-* packages.
 *
 * Works like letitrip.in's local `createApiHandler` but uses `getProviders().session`
 * for auth instead of a hardwired Firebase Admin call. This makes it portable across
 * all consumer projects that register an `ISessionProvider`.
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
  role?: string;
  [key: string]: unknown;
}

interface RouteHandlerOptions<
  TInput = unknown,
  TParams = Record<string, string>,
> {
  /** Require a valid session cookie. Implied when `roles` is set. */
  auth?: boolean;
  /**
   * Read the session cookie if present and attach the user, but do not
   * require authentication. Useful for routes that serve both anonymous
   * and authenticated callers (e.g. public event participation).
   */
  authOptional?: boolean;
  /**
   * If provided, the verified user's `role` must be in this list.
   * Implies `auth: true`.
   */
  roles?: readonly string[];
  /**
   * Fine-grained permission required for this route.
   * When set: also allows `"employee"` role through the role check, then
   * verifies the permission via the registered `rbac` provider.
   * Admin role always bypasses. Requires `rbac` provider to be registered.
   * Implies `auth: true`.
   */
  permission?: string;
  /** Zod schema to validate + parse the JSON request body. */
  schema?: ParseableSchema<TInput>;
  /**
   * Response cache policy for unauthenticated GET routes.
   * Use `false` to disable default public cache headers.
   */
  cache?:
    | false
    | {
        maxAge?: number;
        sMaxAge?: number;
        staleWhileRevalidate?: number;
      };
  /** Route handler. `user` is present when `auth: true`. */
  handler: (ctx: {
    request: Request;
    user?: RouteUser;
    body?: TInput;
    params?: TParams;
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

/** Read the `__session` HTTP-only cookie from request headers. */
function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Verify the session cookie using `getProviders().session`.
 * Returns a `RouteUser` on success, or throws for invalid credentials.
 */
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

/**
 * Create a typed Next.js App Router handler with built-in auth + Zod validation.
 */
export function createRouteHandler<
  TInput = unknown,
  TParams = Record<string, string>,
>(options: RouteHandlerOptions<TInput, TParams>) {
  return async (
    request: Request,
    context: { params: Promise<TParams> },
  ): Promise<Response> => {
    try {
      // -- Auth --------------------------------------------------------------
      let user: RouteUser | undefined;
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
          // No valid session — continue as anonymous
        }
      }

      // Role check — when `permission` is set, also allow "employee" through
      const effectiveRoles = options.roles
        ? options.permission
          ? [...new Set([...options.roles, "employee"])]
          : options.roles
        : options.permission
          ? ["admin", "employee"]
          : [];

      if (effectiveRoles.length > 0) {
        if (!user || !effectiveRoles.includes(user.role ?? "")) {
          return NextResponse.json(
            { success: false, error: "Insufficient permissions" },
            { status: 403 },
          );
        }
      }

      // -- Permission check (employee fine-grained) --------------------------
      if (options.permission && user && !isAdminUser(user)) {
        const { rbac } = getProviders();
        if (!rbac) {
          return NextResponse.json(
            { success: false, error: "RBAC provider not configured" },
            { status: 503 },
          );
        }
        const perms = await rbac.getPermissions(user.uid);
        if (!perms.includes(options.permission)) {
          return NextResponse.json(
            { success: false, error: "Insufficient permissions" },
            { status: 403 },
          );
        }
      }

      // -- Body validation ---------------------------------------------------
      let body: TInput | undefined;
      if (options.schema) {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid JSON body" },
            { status: 400 },
          );
        }
        const result = options.schema.safeParse(raw);
        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: "Validation failed",
              issues: result.error.issues ?? [],
            },
            { status: 400 },
          );
        }
        body = result.data;
      }

      // -- Params ------------------------------------------------------------
      const params = context?.params ? await context.params : undefined;

      const response = await options.handler({
        request,
        user,
        body,
        params: params as TParams | undefined,
      });

      const hasCredentialHeaders =
        !!request.headers.get("authorization") || !!request.headers.get("cookie");
      const canApplyDefaultPublicCache =
        request.method === "GET" &&
        !needsAuth &&
        options.cache !== false &&
        !hasCredentialHeaders &&
        response.status >= 200 &&
        response.status < 300 &&
        !response.headers.has("Cache-Control");

      if (canApplyDefaultPublicCache) {
        const policy = typeof options.cache === "object" ? options.cache : undefined;
        response.headers.set("Cache-Control", buildPublicCacheControl(policy));
      }

      return response;
    } catch (err: unknown) {
      const e = err as { status?: unknown; statusCode?: unknown };
      const status =
        typeof e?.statusCode === "number"
          ? (e.statusCode as number)
          : typeof e?.status === "number"
            ? (e.status as number)
            : 500;
      const message =
        err instanceof Error ? err.message : "Internal server error";

      // 401/403 are expected for protected routes and should not be error-noisy.
      if (status >= 500) {
        console.error(`[createRouteHandler] ${request.method} failed`, err);
      } else if (status >= 400 && status !== 401 && status !== 403) {
        console.warn(`[createRouteHandler] ${request.method} failed (${status})`, err);
      }

      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
}
