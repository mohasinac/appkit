/*
 * WHY: Where the search artifact lives, and how it is served without a
 *      Next.js route in front of it.
 * WHAT: The Firestore manifest singleton, the Storage upload, and the prune.
 *
 * ## Why Storage directly rather than an /api route
 *
 * A version-addressed object written with `immutable` cache headers is served
 * by the browser and any CDN in front of the bucket with no function in the
 * path at all. `storage.rules` is already `allow read: if true` for every
 * object, so no rules change is needed.
 *
 * It is also the only shape that can be deployed AND verified under this
 * round's constraint of no Vercel deploy: the Function writes the artifact and
 * it is immediately fetchable. A same-origin `/api/search-index/*` proxy stays
 * a documented fallback if CORS or egress accounting later argues for it — it
 * would change the two URLs and nothing else.
 *
 * ## 🛑 Old versions MUST be pruned
 *
 * Immutable version-addressed objects never overwrite, so without a prune this
 * accumulates ~384 KB per content change, for ever, against a ~5 GB allowance
 * the media library already shares. Two versions are kept — the current one
 * and the one it replaced — so a client that fetched mid-publish is never
 * orphaned, matching the service worker's `maxEntries: 2`.
 *
 * @tag domain:search
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:searchIndexBuild
 * @tag sideEffects:firestore,storage
 */

import { normalizeError } from "../../../../../errors/normalize";
import { serverLogger } from "../../../../../monitoring/server-logger";
import {
  SEARCH_INDEX_PREFIX,
  SEARCH_MANIFEST_OBJECT,
  searchIndexObjectPath,
} from "../../../../shared/search/artifact-url";
import type { SearchIndexArtifact } from "../../../../shared/search/index-record";
/*
 * `import type` only — erased at runtime, so this file never pulls
 * firebase-admin into a module graph (the Turbopack client-bundle trap,
 * Root Cause #24). `jobs/runtime/types.ts` imports Firestore the same way.
 */
import type { Firestore } from "firebase-admin/firestore";
import type { Bucket } from "@google-cloud/storage";

export const SEARCH_INDEX_COLLECTION = "searchIndex";
export const SEARCH_INDEX_MANIFEST_ID = "manifest";

/*
 * 🛑 `SEARCH_INDEX_PREFIX` and the object paths are IMPORTED, not declared
 * here. They were declared here first, and the client then needed the same
 * two strings — which is a mirror, and a mirror of a URL fails in the worst
 * available way: the builder writes `search-index/v4.json`, the client asks
 * for `searchIndex/v4.json`, and a 404 is indistinguishable from "the index
 * has not been built yet" (Root Cause #42). One declaration, in the shared
 * module both sides already import.
 */

/** Current + previous. See the prune note in the header. */
const KEEP_VERSIONS = 2;

/**
 * 🛑 A declared ceiling, and the build FAILS rather than truncating.
 *
 * Deliberately the opposite of `buildSearchTxt`'s `MAX_TOKENS`, which this
 * codebase complains about in four separate places for silently slicing. A
 * short artifact is a search index missing rows, and nothing downstream can
 * tell that from a small catalogue. 1.5 MB against a measured 384 KB leaves
 * roughly 4x headroom; if it is ever hit, that is a real signal.
 */
export const SEARCH_INDEX_MAX_BYTES = 1_500_000;

export interface SearchIndexManifest {
  schema: number;
  version: number;
  builtAt: string;
  lastFullAt: string | null;
  storagePath: string;
  recordCount: number;
  bytes: number;
  perType: Record<string, number>;
  /** Set by the content triggers; cleared when a build consumes it. */
  dirty: boolean;
}

/*
 * 🛑 The REAL admin types, not hand-rolled structural ones.
 *
 * The first draft declared narrow `DocRef` / `ManifestDb` / `StorageBucket`
 * interfaces "so the job stays testable", and `Firestore` was not assignable
 * to any of them — six type errors. Widening them to match would have meant
 * re-declaring firebase-admin's surface by hand, which is a second
 * declaration that can drift from the first. There is no test suite here to
 * serve anyway (unit tests are banned); verification is a real build against
 * production.
 */
type ManifestDb = Firestore;
type StorageBucket = Bucket;

export function manifestRef(db: ManifestDb) {
  return db.collection(SEARCH_INDEX_COLLECTION).doc(SEARCH_INDEX_MANIFEST_ID);
}

export async function readManifest(db: ManifestDb): Promise<SearchIndexManifest | null> {
  const snap = await manifestRef(db).get();
  if (!snap.exists) return null;
  /*
   * Firestore hands back `DocumentData`, which is `Record<string, any>` — the
   * one place a cast is unavoidable, because the SDK cannot know the shape.
   * Narrowed to the declared interface at the single read site rather than
   * left as `DocumentData` for callers to re-cast: the latter is how a
   * boundary type spreads (Root Cause #98).
   */
  return (snap.data() as SearchIndexManifest | undefined) ?? null;
}

/**
 * Mark the index stale. Called from the content triggers.
 *
 * 🛑 READ-THEN-WRITE, guarding on a BOOLEAN — never a deep compare.
 * Root Cause #92's trigger cost 12 million invocations a day because its
 * no-op guard used `JSON.stringify`, which is key-order sensitive and so
 * never matched. A boolean cannot have that failure mode, and the read means
 * a burst of 50 product writes costs 50 reads and exactly ONE write.
 *
 * Never throws: a failed dirty-mark delays the index by one cadence, and
 * failing the product write that triggered it would be far worse.
 */
export async function markSearchIndexDirty(db: ManifestDb, job: string): Promise<void> {
  try {
    const ref = manifestRef(db);
    const snap = await ref.get();
    if (snap.exists && snap.data()?.dirty === true) return;
    await ref.set({ dirty: true } as SearchIndexManifest, { merge: true });
  } catch (err) {
    const e = normalizeError(err);
    serverLogger.warn("markSearchIndexDirty failed (non-fatal)", { job, message: e.message });
  }
}

export function storagePathFor(version: number): string {
  return searchIndexObjectPath(version);
}

export interface PublishResult {
  storagePath: string;
  bytes: number;
  pruned: number;
}

/**
 * Write the artifact and prune older versions.
 *
 * The object carries `public, max-age=31536000, immutable` because the URL
 * contains the version — a new build is a new URL, so nothing ever needs
 * revalidating.
 */
export async function publishArtifact(
  bucket: StorageBucket,
  artifact: SearchIndexArtifact,
): Promise<PublishResult> {
  const body = Buffer.from(JSON.stringify(artifact), "utf8");

  if (body.byteLength > SEARCH_INDEX_MAX_BYTES) {
    // Loud, not truncated. See SEARCH_INDEX_MAX_BYTES.
    throw new Error(
      `search index artifact is ${body.byteLength} bytes, over the declared ` +
        `${SEARCH_INDEX_MAX_BYTES}. Refusing to publish a silently short index — ` +
        `raise the ceiling deliberately or find out why it grew.`,
    );
  }

  const path = storagePathFor(artifact.version);
  await bucket.file(path).save(body, {
    contentType: "application/json; charset=utf-8",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      contentEncoding: undefined,
    },
  });

  let pruned = 0;
  try {
    const [files] = await bucket.getFiles({ prefix: `${SEARCH_INDEX_PREFIX}/v` });
    const versions = files
      .map((f) => ({ name: f.name, v: Number(/v(\d+)\.json$/.exec(f.name)?.[1] ?? NaN) }))
      .filter((f) => Number.isFinite(f.v))
      .sort((a, b) => b.v - a.v);
    for (const stale of versions.slice(KEEP_VERSIONS)) {
      await bucket.file(stale.name).delete();
      pruned++;
    }
  } catch (err) {
    /*
     * A failed prune is NOT a failed publish. The new artifact is already
     * live and correct; the cost of leaving an extra 384 KB object behind is
     * trivial next to failing a build that produced a good index.
     */
    const e = normalizeError(err);
    serverLogger.warn("search index prune failed (artifact is published)", {
      message: e.message,
    });
  }

  return { storagePath: path, bytes: body.byteLength, pruned };
}

/**
 * Mirror the manifest to Storage so the client needs no Firebase SDK.
 *
 * Writes only the four fields a browser has any business reading — `dirty`,
 * `lastFullAt` and `perType` are build bookkeeping, and publishing "the index
 * is currently stale" to every visitor tells them nothing they can act on.
 * The shape is `SearchIndexManifestPublic`, declared beside the URL builders.
 *
 * ## 🛑 60 seconds, and the number is load-bearing in both directions
 *
 * This is the ONLY uncacheable-for-long hop in the whole design, so it sets
 * the floor on how fast a new build reaches a visitor — and the ceiling on
 * how often a returning visitor pays for a request. The artifact behind it is
 * `immutable`, so a client that re-reads the manifest and finds the same
 * version does one small conditional fetch and no download at all.
 *
 * Too long and the 15-minute build cadence is a lie; too short and every
 * visitor re-requests it per page view for a document that changes a few
 * times an hour.
 *
 * ## Written LAST, and failing it does not fail the build
 *
 * A published artifact with a stale manifest serves the previous index for up
 * to a minute — correct, just behind. A manifest pointing at an artifact that
 * was never written is a 404 on the client's critical path. So the order is
 * artifact, then Firestore, then this; and a throw here is logged, not
 * propagated, because the Firestore manifest (which is what the NEXT build
 * reads) is already correct by this point.
 */
export async function publishManifestMirror(
  bucket: StorageBucket,
  manifest: SearchIndexManifest,
): Promise<void> {
  try {
    const body = Buffer.from(
      JSON.stringify({
        schema: manifest.schema,
        version: manifest.version,
        builtAt: manifest.builtAt,
        recordCount: manifest.recordCount,
      }),
      "utf8",
    );
    await bucket.file(SEARCH_MANIFEST_OBJECT).save(body, {
      contentType: "application/json; charset=utf-8",
      metadata: { cacheControl: "public, max-age=60" },
    });
  } catch (err) {
    const e = normalizeError(err);
    /*
     * WARN rather than throw. But it is a real symptom: the artifact is live
     * and no client will ever learn its version, so the index silently stops
     * advancing while every other signal says the build succeeded. That is
     * precisely the "confident wrong answer" shape, which is why it is logged
     * at WARN and not swallowed.
     */
    serverLogger.warn("search index manifest mirror failed (artifact is published)", {
      version: manifest.version,
      message: e.message,
    });
  }
}
