/**
 * Browser stub for @mohasinac/appkit/providers/db-firebase
 *
 * This file is served to the browser webpack build via the "browser"
 * condition in package.json exports.  All firebase-admin SDK code must
 * only run on the server; this stub exists solely to satisfy the
 * static-analysis graph without pulling any Node.js-only dependencies
 * into the client bundle.
 *
 * None of these functions are ever called in the browser — they are
 * defined here only so that webpack can resolve the module without error
 * and tree-shake the unused exports away.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function getAdminApp(): never {
  throw new Error("getAdminApp is server-only");
}
export function getAdminAuth(): never {
  throw new Error("getAdminAuth is server-only");
}
export function getAdminDb(): never {
  throw new Error("getAdminDb is server-only");
}
export function getAdminStorage(): never {
  throw new Error("getAdminStorage is server-only");
}
export function getAdminRealtimeDb(): never {
  throw new Error("getAdminRealtimeDb is server-only");
}
export function _resetAdminSingletons(): void {
  // no-op in browser
}
export function removeUndefined<T>(obj: T): T {
  return obj;
}
export function prepareForFirestore(data: any): any {
  return data;
}
export function deserializeTimestamps<T>(data: any): T {
  return data as T;
}
export const FirebaseRepository: any = null;
export const FirebaseSieveRepository: any = null;
export const FirebaseRealtimeRepository: any = null;
export const firebaseDbProvider: any = null;
export const RTDB_PATHS = {
  PRESENCE: "presence",
  CHAT: "chat",
  NOTIFICATIONS: "notifications",
  LIVE_UPDATES: "live_updates",
  AUTH_EVENTS: "auth_events",
  PAYMENT_EVENTS: "payment_events",
  BULK_EVENTS: "bulk_events",
} as const;
