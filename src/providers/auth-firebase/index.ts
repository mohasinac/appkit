/**
 * @mohasinac/auth-firebase
 *
 * Firebase Auth implementation of IAuthProvider + ISessionProvider
 * from @mohasinac/contracts.
 *
 * Server-side only — never import in browser/client-component code.
 */

// IAuthProvider implementation
export { firebaseAuthProvider } from "./provider";

// ISessionProvider implementation
export {
  firebaseSessionProvider,
  createSessionCookieFromToken,
  // Alias for backwards compatibility
  createSessionCookieFromToken as createSessionCookie,
} from "./session";

// Standalone helpers (drop-in replacements for auth-server.ts)
export {
  verifyIdToken,
  verifySessionCookie,
  createMiddlewareAuthChain,
  requireAuth,
  requireRole,
  requireAuthUser,
  requireRoleUser,
  getUserFromRequest,
  requireAuthFromRequest,
  requireRoleFromRequest,
  revokeUserTokens,
} from "./helpers";
