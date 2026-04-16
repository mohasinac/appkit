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

function serverOnly(name: string): never {
  throw new Error(`${name} is server-only`);
}

export function createSessionCookieFromToken(): never { return serverOnly("createSessionCookieFromToken"); }
export function createSessionCookie(): never { return serverOnly("createSessionCookie"); }
export function verifyIdToken(): never { return serverOnly("verifyIdToken"); }
export function verifySessionCookie(): never { return serverOnly("verifySessionCookie"); }
export function createMiddlewareAuthChain(): never { return serverOnly("createMiddlewareAuthChain"); }
export function requireAuth(): never { return serverOnly("requireAuth"); }
export function requireRole(): never { return serverOnly("requireRole"); }
export function requireAuthUser(): never { return serverOnly("requireAuthUser"); }
export function requireRoleUser(): never { return serverOnly("requireRoleUser"); }
export function getUserFromRequest(): never { return serverOnly("getUserFromRequest"); }
export function requireAuthFromRequest(): never { return serverOnly("requireAuthFromRequest"); }
export function requireRoleFromRequest(): never { return serverOnly("requireRoleFromRequest"); }
export function revokeUserTokens(): never { return serverOnly("revokeUserTokens"); }
