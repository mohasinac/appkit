/**
 * A storage provider that REFUSES — for every app that must not touch Storage.
 *
 * ## 🛑 Why this exists
 *
 * Owner, 2026-11-11: *"only the media subdomain and its api can be used to do
 * so, no other subdomain has access to the media"*.
 *
 * Measured the same day, every app except `bookkeeping` registered
 * `firebaseStorageProvider` — events, blogs, auth and media all held direct
 * Admin-SDK access to the bucket.
 *
 * 🛑 **`storage.rules` cannot enforce this.** The rules file already says *"NO
 * client-side uploads are permitted, ever"* and that is true of the CLIENT
 * SDK — but the **Admin SDK bypasses rules entirely**. A server route in any
 * of those apps could read, write or delete any object. The only things that
 * can enforce the boundary are removing the provider (this file) and, later,
 * IAM.
 *
 * `bookkeeping` already proved the shape with a local copy; this is that copy
 * promoted so there is ONE definition rather than four that drift.
 *
 * ## 🛑 It THROWS; it does not return empty
 *
 * `getPublicUrl` is synchronous in the contract, so it throws rather than
 * rejecting. Returning `""` would be the silent-failure shape — an empty
 * `src` renders as a broken image with no error anywhere, which is precisely
 * the class of defect the measured `/media` 404s belonged to. Every method
 * fails the same way and names the app and the remedy, so whichever one a
 * future feature reaches first produces a self-service stack trace.
 *
 * @tag domain:providers
 * @tag layer:provider
 */

import type { IStorageProvider } from "../contracts/storage";

/**
 * @param appName Named in the error, so a stack says which deployment refused.
 * @param reason Why this app has no storage. Defaults to the media-ownership
 *   rule, which is the reason for all four current consumers.
 */
export function createUnavailableStorageProvider(
  appName: string,
  reason = "media is owned by the media service — upload through its API rather than the bucket",
): IStorageProvider {
  const unavailable = (method: string): Error =>
    new Error(
      `[${appName}] No storage provider is registered (called ${method}). ` +
        `${reason}.`,
    );

  return {
    upload() {
      return Promise.reject(unavailable("upload"));
    },
    delete() {
      return Promise.reject(unavailable("delete"));
    },
    getPublicUrl(): string {
      throw unavailable("getPublicUrl");
    },
    getSignedUrl() {
      return Promise.reject(unavailable("getSignedUrl"));
    },
    copy() {
      return Promise.reject(unavailable("copy"));
    },
    list() {
      return Promise.reject(unavailable("list"));
    },
  };
}
