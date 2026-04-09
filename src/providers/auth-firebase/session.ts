/**
 * firebaseSessionProvider — ISessionProvider
 *
 * Implements `@mohasinac/contracts` `ISessionProvider` using Firebase Admin SDK
 * session cookies (HTTP-only, 5-day TTL by default).
 *
 * Server-side only.
 */

import type { ISessionProvider, AuthPayload } from "@mohasinac/contracts";
import { getAdminAuth } from "@mohasinac/db-firebase";

/** Default session duration: 5 days (in milliseconds). */
const DEFAULT_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000;

const EXPECTED_SESSION_CODES = new Set([
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/argument-error",
]);

export const firebaseSessionProvider: ISessionProvider = {
  /**
   * `payload` must be an `AuthPayload` from a freshly verified ID token.
   * The underlying Firebase API expects an ID token string, not just a UID.
   * If you have the raw ID token, use `createSessionCookieFromToken()` instead.
   *
   * Here we create a custom token → exchange for an effective session.
   * In practice, callers should use `createSessionCookieFromToken()`.
   */
  async createSession(payload: AuthPayload): Promise<string> {
    void payload;
    // Custom tokens cannot be used to mint a session cookie directly —
    // createSession via ISessionProvider is called at the point where
    // the caller already has a verified payload.  We delegate to a helper
    // that is invoked in the auth API route where the raw ID token is available.
    throw new Error(
      "Use createSessionCookieFromToken(idToken) instead of createSession(payload). " +
        "Firebase session cookies must be created from a raw ID token string.",
    );
  },

  async verifySession(cookie: string): Promise<AuthPayload> {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        role: (decoded.role as string | undefined) ?? "user",
        emailVerified: decoded.email_verified ?? false,
        claims: Object.fromEntries(
          Object.entries(decoded).filter(
            ([k]) =>
              ![
                "uid",
                "email",
                "email_verified",
                "iat",
                "exp",
                "aud",
                "iss",
                "sub",
                "auth_time",
                "firebase",
              ].includes(k),
          ),
        ),
      };
    } catch (err) {
      if (!EXPECTED_SESSION_CODES.has((err as { code?: string }).code ?? "")) {
        console.error(
          "[@mohasinac/auth-firebase] Session cookie verification failed:",
          err,
        );
      }
      throw err;
    }
  },

  async destroySession(cookie: string): Promise<void> {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(cookie, false);
      await getAdminAuth().revokeRefreshTokens(decoded.uid);
    } catch {
      // Best-effort: if cookie is already invalid, treat as already destroyed
    }
  },
};

/**
 * Mint a Firebase session cookie from a raw Firebase ID token string.
 *
 * Use this in your `POST /api/auth/session` route handler.
 *
 * @param idToken   The ID token from `firebase.auth().currentUser.getIdToken()`.
 * @param expiresIn Cookie duration in milliseconds (default: 5 days).
 */
export async function createSessionCookieFromToken(
  idToken: string,
  expiresIn: number = DEFAULT_EXPIRES_IN_MS,
): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, { expiresIn });
}
