/**
 * Server-side Firebase Auth helper functions.
 *
 * Drop-in replacements for the functions in `src/lib/firebase/auth-server.ts`.
 * All functions use the shared `getAdminAuth()` singleton from `@mohasinac/db-firebase`.
 */

import type { AuthPayload } from "../../contracts";
import type { NextRequest } from "next/server";
import { getAdminAuthLite } from "../db-firebase/admin-auth-lite";
import { createSessionCookieFromToken } from "./session";

export { createSessionCookieFromToken };

const EXPECTED_AUTH_CODES = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
]);

// --- Token helpers ------------------------------------------------------------

/** Verify a Firebase ID token. Returns null for expected auth failures. */
export async function verifyIdToken(
  token: string,
): Promise<AuthPayload | null> {
  try {
    const decoded = await getAdminAuthLite().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: (decoded.role as string | undefined) ?? "user",
      emailVerified: decoded.email_verified ?? false,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
      phoneNumber: (decoded.phone_number as string | undefined) ?? null,
    };
  } catch (err) {
    if (!EXPECTED_AUTH_CODES.has((err as { code?: string }).code ?? "")) {
      console.error(
        "[@mohasinac/auth-firebase] Token verification failed:",
        err,
      );
    }
    return null;
  }
}

/** Verify a Firebase session cookie. Returns null for expected auth failures. */
export async function verifySessionCookie(
  cookie: string,
): Promise<AuthPayload | null> {
  try {
    const decoded = await getAdminAuthLite().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: (decoded.role as string | undefined) ?? "user",
      emailVerified: decoded.email_verified ?? false,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
      phoneNumber: (decoded.phone_number as string | undefined) ?? null,
    };
  } catch (err) {
    if (!EXPECTED_AUTH_CODES.has((err as { code?: string }).code ?? "")) {
      console.error(
        "[@mohasinac/auth-firebase] Session cookie verification failed:",
        err,
      );
    }
    return null;
  }
}

/**
 * Create a middleware auth chain function.
 *
 * Returns an async function that reads the `__session` (or `idToken`) cookie
 * from a `RequestCookies`-like object and returns the decoded `AuthPayload`.
 *
 * @example
 * ```ts
 * import { createMiddlewareAuthChain } from "@mohasinac/auth-firebase";
 *
 * const getUser = createMiddlewareAuthChain();
 * const user = await getUser(request.cookies);
 * ```
 */
export function createMiddlewareAuthChain() {
  return async function getUser(cookies: {
    get(name: string): { value: string } | undefined;
  }): Promise<AuthPayload | null> {
    const session = cookies.get("__session")?.value;
    if (session) {
      const user = await verifySessionCookie(session);
      if (user) return user;
    }

    const idToken = cookies.get("idToken")?.value;
    if (idToken) {
      return verifyIdToken(idToken);
    }

    return null;
  };
}

/**
 * Require a valid session — throws if not authenticated.
 *
 * @param cookies  `RequestCookies` from `request.cookies` (middleware) or
 *                 `await cookies()` from `next/headers` (RSC / API route).
 */
export async function requireAuth(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<AuthPayload> {
  const chain = createMiddlewareAuthChain();
  const user = await chain(cookies);
  if (!user) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return user;
}

/**
 * Require a specific role — throws 401/403 if not authenticated or wrong role.
 *
 * @param cookies  Cookie store (same as `requireAuth`).
 * @param role     A single role string or an array of allowed roles.
 * @param resolveRole  Optional async function to resolve the role from the DB.
 */
export async function requireRole(
  cookies: { get(name: string): { value: string } | undefined },
  role: string | string[],
  resolveRole?: (uid: string) => Promise<string>,
): Promise<AuthPayload> {
  const user = await requireAuth(cookies);
  const allowed = Array.isArray(role) ? role : [role];

  let userRole = user.role;
  if (resolveRole) {
    userRole = await resolveRole(user.uid);
  }

  if (!allowed.includes(userRole)) {
    throw Object.assign(
      new Error(`Forbidden — requires role: ${allowed.join(" | ")}`),
      { statusCode: 403 },
    );
  }

  return { ...user, role: userRole };
}

// --- Server-action / RSC helpers (no-arg, reads Next.js cookie store) ---------

/**
 * Require authentication in a Server Action or RSC context.
 * Reads `__session` / `idToken` cookies via `next/headers` `cookies()`.
 * Returns `AuthPayload` or throws 401.
 */
export async function requireAuthUser(): Promise<AuthPayload> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return requireAuth(cookieStore);
}

/**
 * Require a specific role in a Server Action or RSC context.
 * Reads cookies via `next/headers` and resolves role via optional `resolveRole`.
 */
export async function requireRoleUser(
  role: string | string[],
  resolveRole?: (uid: string) => Promise<string>,
): Promise<AuthPayload> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return requireRole(cookieStore, role, resolveRole);
}

// --- Request-level helpers ----------------------------------------------------

/**
 * Resolve the `__session` cookie from a `Request` or `NextRequest`.
 * Handles both Next.js request objects and standard Web API `Request`.
 */
function extractSessionCookie(request: Request): string | undefined {
  if (
    "cookies" in request &&
    typeof (request as NextRequest).cookies?.get === "function"
  ) {
    return (request as NextRequest).cookies.get("__session")?.value;
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]*)/);
  return match?.[1];
}

/**
 * Get the authenticated user document from a request's session cookie.
 * Returns null if the request is unauthenticated or the session is invalid.
 */
export async function getUserFromRequest<T = unknown>(
  request: Request,
  findById: (uid: string) => Promise<T | null>,
): Promise<T | null> {
  try {
    const sessionCookie = extractSessionCookie(request);
    if (!sessionCookie) return null;
    const payload = await verifySessionCookie(sessionCookie);
    if (!payload) return null;
    return findById(payload.uid);
  } catch {
    return null;
  }
}

/**
 * Require an authenticated user from a request. Throws if not authenticated.
 */
export async function requireAuthFromRequest<T = unknown>(
  request: Request,
  findById: (uid: string) => Promise<T | null>,
  isDisabled?: (user: T) => boolean,
): Promise<T> {
  const user = await getUserFromRequest(request, findById);
  if (!user) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  if (isDisabled?.(user)) {
    throw Object.assign(new Error("Account is disabled"), { statusCode: 401 });
  }
  return user;
}

/**
 * Require a specific role from a request.
 */
export async function requireRoleFromRequest<T = unknown>(
  request: Request,
  findById: (uid: string) => Promise<T | null>,
  roles: string | string[],
  getRole: (user: T) => string,
): Promise<T> {
  const user = await requireAuthFromRequest(request, findById);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(getRole(user))) {
    throw Object.assign(
      new Error(`Forbidden — requires role: ${allowed.join(" | ")}`),
      { statusCode: 403 },
    );
  }
  return user;
}

/**
 * Revoke all refresh tokens for a Firebase user (server-side).
 */
export async function revokeUserTokens(uid: string): Promise<void> {
  await getAdminAuthLite().revokeRefreshTokens(uid);
}
