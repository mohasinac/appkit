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
   * If provided, the verified user's `role` must be in this list.
   * Implies `auth: true`.
   */
  roles?: string[];
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
        options.auth || (options.roles && options.roles.length > 0);

      if (needsAuth) {
        user = await verifySession(request);
      }

      if (options.roles && options.roles.length > 0) {
        if (!user || !options.roles.includes(user.role ?? "")) {
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
      // Structured errors thrown with .status
      const status =
        typeof (err as { status?: unknown })?.status === "number"
          ? (err as { status: number }).status
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
