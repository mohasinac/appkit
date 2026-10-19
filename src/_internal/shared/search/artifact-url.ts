/*
 * WHY: The browser and the builder must agree on where the search artifact
 *      lives, and the obvious URL for a public Storage object is the wrong
 *      one.
 * WHAT: The two public URLs — the manifest and a versioned artifact — derived
 *       from the bucket name alone, with no Firebase SDK on either side.
 *
 * ## 🛑 `storage.googleapis.com/<bucket>/<path>` does NOT work. Measured.
 *
 * It is the first URL anyone reaches for and it returns **403**:
 *
 *   GET https://storage.googleapis.com/<bucket>/search-index/v3.json   -> 403
 *   GET https://firebasestorage.googleapis.com/v0/b/<bucket>/o/
 *       search-index%2Fv3.json?alt=media                               -> 200
 *
 * `storage.rules`'s `allow read: if true` is a **Firebase Storage** rule. It
 * is evaluated by the Firebase download endpoint and has no bearing on the
 * plain GCS JSON/XML API, which answers to IAM and object ACLs — neither of
 * which grants `allUsers`. So the rule that makes this artifact public only
 * applies on one of the two hosts.
 *
 * Verified on the live bucket 2026-10-19, on the second host:
 *
 *   Cache-Control: public, max-age=31536000, immutable   (passed through)
 *   Access-Control-Allow-Origin: https://www.letitrip.in
 *   Vary: Origin
 *   Content-Length: 418830
 *
 * So the response is cacheable, CORS-readable and non-opaque — which is the
 * whole precondition for the service worker rule and for being able to tell a
 * 404 apart from an empty index.
 *
 * ## 🛑 The tracked CORS config had drifted from the live bucket
 *
 * Found while verifying the above. `appkit/firebase/base/storage-cors.json`
 * is the tracked source of truth and `npm run storage:cors` applies it — but
 * the live bucket had an origin (`letitrip-in-app.vercel.app`), a method
 * (`POST`) and two response headers (`x-goog-resumable`,
 * `x-goog-content-length-range`) the file did not, all of which the
 * resumable-upload path uses. So running the script to "sync" it would have
 * NARROWED the live config and broken uploads, in a repo where that command
 * reads like the safe, idempotent thing to do.
 *
 * The file is now a strict SUPERSET of what was measured live, so applying it
 * can only widen. The config was NOT re-applied as part of this work: GET
 * from the app origins already worked, and re-applying is an upload-path
 * change that has no business riding along with a search feature.
 *
 * ## The path must be percent-encoded WHOLE
 *
 * `/v0/b/<bucket>/o/<object>` takes the object name as ONE path segment, so
 * the `/` inside `search-index/v3.json` has to become `%2F`. `encodeURIComponent`
 * does exactly that; `encodeURI` does not, and would 404 in a way that reads
 * like a missing artifact rather than a malformed URL.
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:useSearchIndex,artifact-store,verify-search-serving
 * @tag sideEffects:none
 */

/** `search-index/v{n}.json` — the version IS the cache key. */
export const SEARCH_INDEX_PREFIX = "search-index";

/**
 * The manifest mirror's object name.
 *
 * 🛑 A MIRROR of `searchIndex/manifest` in Firestore, never the source of
 * truth. The build writes Firestore first and this second, because the
 * Firestore document is what the next build reads to decide its mode — a
 * mirror that disagrees costs a stale client for 60 seconds, whereas a
 * manifest the builder cannot trust costs a full rebuild.
 *
 * It exists so the client bootstrap is two plain `fetch`es and no Firebase
 * SDK: pulling in the client SDK to read one small document would cost more
 * bytes than the index it is pointing at.
 */
export const SEARCH_MANIFEST_OBJECT = `${SEARCH_INDEX_PREFIX}/manifest.json`;

export function searchIndexObjectPath(version: number): string {
  return `${SEARCH_INDEX_PREFIX}/v${version}.json`;
}

/** Public download URL for any object in the app's Storage bucket. */
export function firebaseDownloadUrl(bucket: string, objectPath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

export function searchManifestUrl(bucket: string): string {
  return firebaseDownloadUrl(bucket, SEARCH_MANIFEST_OBJECT);
}

export function searchArtifactUrl(bucket: string, version: number): string {
  return firebaseDownloadUrl(bucket, searchIndexObjectPath(version));
}

/**
 * What the client needs out of the manifest, and nothing more.
 *
 * Deliberately NOT the server's `SearchIndexManifest`: that one carries
 * `dirty`, `lastFullAt` and `perType`, which are build bookkeeping. A client
 * type that structurally accepts them would invite someone to render build
 * state in the UI, and then the mirror could never drop a field.
 */
export interface SearchIndexManifestPublic {
  readonly schema: number;
  readonly version: number;
  readonly builtAt: string;
  readonly recordCount: number;
}
