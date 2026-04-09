/**
 * @mohasinac/auth-firebase
 *
 * Firebase Auth implementation of IAuthProvider + ISessionProvider
 * from @mohasinac/contracts.
 *
 * Server-side only — never import in browser/client-component code.
 */

// IAuthProvider implementation
export { firebaseAuthProvider } from "./provider.js";

// ISessionProvider implementation
export {
  firebaseSessionProvider,
  createSessionCookieFromToken,
} from "./session.js";

// Standalone helpers (drop-in replacements for auth-server.ts)
export {
  verifyIdToken,
  verifySessionCookie,
  createMiddlewareAuthChain,
  requireAuth,
  requireRole,
} from "./helpers.js";
