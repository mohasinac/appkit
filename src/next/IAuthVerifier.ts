/**
 * IAuthVerifier — Injectable auth interface for createApiHandler.
 *
 * Decouples @mohasinac/next from any specific auth provider (Firebase, Auth.js, etc.).
 * The consuming app provides a concrete implementation backed by its own
 * auth SDK. The interface is intentionally minimal — only what createApiHandler
 * needs: a uid and an optional role string.
 *
 * @example
 * ```ts
 * // apps/web/src/lib/firebase/auth-verifier.ts
 * import type { IAuthVerifier, AuthVerifiedUser } from '@mohasinac/next';
 * import { getAdminAuth } from '@/lib/firebase/admin';
 *
 * export const firebaseAuthVerifier: IAuthVerifier = {
 *   async verify(sessionCookie) {
 *     const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
 *     return { uid: decoded.uid, role: decoded.role as string | undefined };
 *   },
 * };
 * ```
 */

/**
 * Minimal user shape returned by a successful auth verification.
 * Implementors may return additional fields; createApiHandler only consumes
 * `uid` and `role`.
 */
export interface AuthVerifiedUser {
  uid: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Generic auth verifier interface.
 *
 * An implementation should:
 * - Verify the session token/cookie cryptographically.
 * - Throw or return `null` when verification fails (both are handled by
 *   createApiHandler — returning null triggers a 401; throwing triggers
 *   handleApiError which maps to a 401 for AuthenticationError subclasses).
 */
export interface IAuthVerifier {
  /**
   * Verify a session token (cookie value, JWT, or any string credential) and
   * return the decoded user payload, or `null` if invalid.
   *
   * @param token - Raw session token (typically an httpOnly cookie value).
   * @returns Verified user, or `null` when the token is expired / invalid.
   * @throws May throw an `AuthenticationError` subclass; createApiHandler
   *         will convert it to a 401 response via handleApiError.
   */
  verify(token: string): Promise<AuthVerifiedUser | null>;
}
