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
} from "./session";

// Standalone helpers (drop-in replacements for auth-server.ts)
export {
  verifyIdToken,
  verifySessionCookie,
  createMiddlewareAuthChain,
  requireAuth,
  requireRole,
} from "./helpers";
