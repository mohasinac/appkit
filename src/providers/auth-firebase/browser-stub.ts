/**
 * Browser stub for @mohasinac/appkit/providers/auth-firebase
 *
 * This file is served to the browser webpack build via the "browser"
 * condition in package.json exports.  All firebase-admin Auth code must
 * only run on the server; this stub exists solely to satisfy the
 * static-analysis graph without pulling any Node.js-only dependencies
 * into the client bundle.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const firebaseAuthProvider: any = null;
export const firebaseSessionProvider: any = null;
export function createSessionCookieFromToken(): never {
  throw new Error("createSessionCookieFromToken is server-only");
}
export function verifyIdToken(): never {
  throw new Error("verifyIdToken is server-only");
}
export function verifySessionCookie(): never {
  throw new Error("verifySessionCookie is server-only");
}
export function createMiddlewareAuthChain(): never {
  throw new Error("createMiddlewareAuthChain is server-only");
}
export function requireAuth(): never {
  throw new Error("requireAuth is server-only");
}
export function requireRole(): never {
  throw new Error("requireRole is server-only");
}
