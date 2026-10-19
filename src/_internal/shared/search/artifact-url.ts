/*
 * WHY: The browser and the builder must agree on where the search artifact
 *      lives, and the obvious URL for a public Storage object is the wrong
 *      one.
 * WHAT: The two public URLs — the manifest and a versioned artifact — derived
 *       from the bucket name alone, with no Firebase SDK on either side.
 *
 * ## 🛑 The plain `GCS_HOST` URL does NOT work. Measured.
 *
 * It is the first one anyone reaches for and it returns **403**:
 *
 *   GET https://{GCS_HOST}/<bucket>/search-index/v3.json              -> 403
 *   GET https://{FIREBASE_STORAGE_HOST}/v0/b/<bucket>/o/
 *       search-index%2Fv3.json?alt=media                              -> 200
 *
 * (Both hosts are named by their constants rather than spelled out, because
 * `audit-firestore-storage-urls` is strict-zero on the literals and does not
 * strip comments. That is the correct constraint, not a nuisance: the hosts
 * have exactly one declaration, in `utils/media-url.ts`, and this file
 * imports it rather than becoming a second.)
 *
 * `storage.rules`'s `allow read: if true` is a **Firebase Storage** rule. It
 * is evaluated by the Firebase download endpoint and has no bearing on the
 * plain GCS JSON/XML API, which answers to IAM and object ACLs — neither of
 * which grants `allUsers`. So the rule that makes this artifact public only
 * applies on one of the two hosts.
 *
 * ## 🛑 Why this is NOT a `/media/<slug>` reference
 *
 * That audit's stated rule is "every MEDIA reference flows through
 * `/media/<slug>`", and this is not media. Two reasons it must not be routed
 * that way:
 *
 *  1. the proxy resolves a slug through a `mediaAssets/{slug}` Firestore read
 *     and then watermarks images — neither of which means anything for a JSON
 *     data file;
 *  2. it would put a Vercel function in the path of a 405 KB download for
 *     every cold visitor. Root Cause #104 is precisely that bill — 52.52 GB
 *     of Fast Origin Transfer against a 10 GB allowance — and the whole point
 *     of an immutable version-addressed object is that nothing of ours serves
 *     it twice.
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

/*
 * The host comes from its ONE declaration. `utils/media-url.ts` is named in
 * `audit-firestore-storage-urls`'s allowlist as the sole place these strings
 * may appear, with every other module importing from it — so importing is
 * the sanctioned mechanism here, not an exemption carved out for search.
 */
import { FIREBASE_STORAGE_HOST } from "../../../utils/media-url";

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
  return `https://${FIREBASE_STORAGE_HOST}/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
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
