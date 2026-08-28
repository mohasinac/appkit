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
export const firebaseDbProvider: any = null;
// Re-exported, NOT re-declared. This file is the `browser` resolution target, so
// the byte-for-byte copy that used to live here meant client code and server
// code read two independently-maintained definitions of the same constant, with
// nothing guarding the drift. `rtdb-paths.ts` has no imports, so it is safe to
// pull into a browser bundle directly.
export { RTDB_PATHS } from "./rtdb-paths";
// Client config builder � safe in all environments
export { buildFirebaseClientConfig, normalizeFirebaseConfigValue } from './client-config';
export type { FirebaseClientConfig } from './client-config';