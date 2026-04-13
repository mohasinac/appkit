/**
 * Server-side Firebase Auth helper functions.
 *
 * Drop-in replacements for the functions in `src/lib/firebase/auth-server.ts`.
 * All functions use the shared `getAdminAuth()` singleton from `@mohasinac/db-firebase`.
 */

import type { AuthPayload } from "../../contracts";
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

// ─── Token helpers ────────────────────────────────────────────────────────────

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
