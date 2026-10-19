/*
 * Core: build the public search index artifact.
 *
 * ## 🛑 THE READ BUDGET IS WHY THIS JOB HAS THREE MODES
 *
 * Firestore bills per document read regardless of `select()`. A full rebuild
 * every 15 minutes is `96 × 3,730 ≈ 358,000 reads/day` against a 50,000/day
 * free tier — seven times over. Hourly is still ~89,000. So:
 *
 *   idle        manifest not dirty, full not due     1 read       ~90/day
 *   incremental dirty: `updatedAt >` per source      13 + changed ~200/day
 *   full        >24h since the last one              3,730        3,730/day
 *
 * ≈ 4,000 reads/day, about 8% of the tier. Measured on production: a full
 * build is 3,750 reads, 3,589 records, 384 KB raw / 48 KB brotli, in 4.1s.
 *
 * 🛑 EVERY RUN LOGS ITS MODE AND READ COUNT. If the incremental path ever
 * breaks and silently falls back to FULL each cadence, that is 358,000
 * reads/day and a quota wall — and the only way anyone finds out before the
 * wall is this line. A job that does the wrong thing cheaply is a bug; one
 * that does it seven times over the tier is an outage.
 *
 * ## Why its own scheduled job rather than folding into an existing one
 *
 * `countersReconcile` and `productStatsSync` already run near their 540s
 * ceiling, and a full rebuild failing inside one of them would take category
 * metrics down with it. `priceIndexRollup`'s header makes the same argument
 * for staying separate. CLAUDE.md explicitly accepts ~$0.10/month for a new
 * distinct-cadence Scheduler job rather than routing around it.
 *
 * @tag domain:search
 * @tag layer:server
 * @tag pattern:job-core
 * @tag access:server
 * @tag consumers:searchIndexBuildHandler
 * @tag sideEffects:firestore,storage
 */

import { getAdminStorage } from "../../../../providers/db-firebase";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import {
  buildFull,
  buildIncremental,
} from "../../features/search/index-build/build";
import {
  manifestRef,
  publishArtifact,
  publishManifestMirror,
  readManifest,
  storagePathFor,
  type SearchIndexManifest,
} from "../../features/search/index-build/artifact-store";
import type { SearchIndexArtifact } from "../../../shared/search/index-record";
import type { JobContext } from "../runtime/types";

/** How stale the index may get before a reconciling full pass is forced. */
const FULL_REBUILD_INTERVAL_MS = 24 * 60 * 60 * 1000;

function dueForFull(manifest: SearchIndexManifest | null, now: Date): boolean {
  if (!manifest || !manifest.lastFullAt) return true;
  const last = Date.parse(manifest.lastFullAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= FULL_REBUILD_INTERVAL_MS;
}

/**
 * Fetch the previous artifact so an incremental pass can patch it.
 *
 * Returns null on any failure, which makes the caller fall back to a FULL
 * build. That is the right degradation: a full build is expensive but
 * correct, whereas patching an artifact we could not read is not possible at
 * all.
 */
async function readPreviousArtifact(
  storagePath: string,
): Promise<SearchIndexArtifact | null> {
  try {
    const bucket = getAdminStorage().bucket();
    const [buf] = await bucket.file(storagePath).download();
    return JSON.parse(buf.toString("utf8")) as SearchIndexArtifact;
  } catch (err) {
    const e = normalizeError(err);
    /*
     * WARN, not silence. Returning null here is a correct degradation — the
     * caller falls back to a FULL build, which is expensive but right — and
     * that is exactly why it needs a log line: a permanently unreadable
     * previous artifact turns every run into a 3,730-read full build and the
     * only outward sign is the read count creeping up. The fallback hides the
     * fault, so the log is the one thing that does not.
     */
    serverLogger.warn("search index: previous artifact unreadable, falling back to FULL", {
      storagePath,
      message: e.message,
    });
    return null;
  }
}

export async function runSearchIndexBuild(ctx: JobContext): Promise<void> {
  const { db, logger, now } = ctx;

  const manifest = await readManifest(db);
  const wantFull = dueForFull(manifest, now);

  /*
   * The idle exit. One read, ~90 times a day. Without it the job would do a
   * 13-query incremental pass every 15 minutes whether or not anything
   * changed, which is 1,250 reads/day spent proving nothing happened.
   */
  if (!wantFull && manifest && manifest.dirty !== true) {
    logger.info("search index: idle (not dirty, full not due)", { reads: 1 });
    return;
  }

  const version = (manifest?.version ?? 0) + 1;

  let result;
  let mode: "full" | "incremental" = "full";
  if (!wantFull && manifest) {
    const previous = await readPreviousArtifact(manifest.storagePath);
    if (previous) {
      const since = new Date(manifest.builtAt);
      result = await buildIncremental(db, previous, since, version, now);
      mode = "incremental";
    }
  }
  if (!result) {
    result = await buildFull(db, version, now);
    mode = "full";
  }

  const { artifact, stats } = result;
  const published = await publishArtifact(getAdminStorage().bucket(), artifact);

  const next: SearchIndexManifest = {
    schema: artifact.schema,
    version,
    builtAt: artifact.builtAt,
    lastFullAt: mode === "full" ? artifact.builtAt : (manifest?.lastFullAt ?? artifact.builtAt),
    storagePath: published.storagePath,
    recordCount: artifact.r.length,
    bytes: published.bytes,
    perType: stats.perType,
    /*
     * Cleared LAST, after the artifact is live — clearing it first would lose
     * every write that arrived while this build was running.
     *
     * 🛑 And NOT cleared at all if any source threw. An incremental pass skips
     * a failing source by design (the previous values stay, which is correct
     * and slightly stale), but clearing `dirty` on top of that would mean the
     * next run exits idle and those types never recover until the daily full
     * pass — a partial index reported as a clean one. Staying dirty costs one
     * retry per cadence and is self-healing.
     *
     * This mattered immediately: the first incremental run against production
     * failed on every source with a `where` clause, for a missing composite
     * index, and without this it would have published a mostly-empty patch
     * and called it done.
     */
    dirty: stats.failed > 0,
  };
  await manifestRef(db).set(next, { merge: true });
  /*
   * Firestore first (the next build reads it), the public mirror second (the
   * browser reads it). See `publishManifestMirror` for why a failure here is
   * logged rather than thrown.
   */
  await publishManifestMirror(getAdminStorage().bucket(), next);

  /*
   * 🛑 The line that makes a runaway visible. `reads` is the number that has
   * to stay inside the budget, and `mode` is what explains it.
   */
  const line = stats.failed > 0 ? logger.warn : logger.info;
  line("search index built", {
    mode,
    version,
    reads: stats.reads,
    // 🛑 Surfaced, not swallowed. A non-zero count means the artifact is
    // incomplete for those types and the manifest stays dirty for a retry.
    failedSources: stats.failed,
    records: artifact.r.length,
    dropped: stats.dropped,
    bytes: published.bytes,
    prunedVersions: published.pruned,
    durationMs: stats.durationMs,
  });
}

/**
 * Force a full rebuild, ignoring the manifest's cadence. For a one-off repair
 * after a schema bump or a reseed.
 */
export async function runSearchIndexFullRebuild(ctx: JobContext): Promise<void> {
  const { db, logger, now } = ctx;
  const manifest = await readManifest(db);
  const version = (manifest?.version ?? 0) + 1;
  try {
    const { artifact, stats } = await buildFull(db, version, now);
    const published = await publishArtifact(getAdminStorage().bucket(), artifact);
    const next: SearchIndexManifest = {
      schema: artifact.schema,
      version,
      builtAt: artifact.builtAt,
      lastFullAt: artifact.builtAt,
      storagePath: published.storagePath,
      recordCount: artifact.r.length,
      bytes: published.bytes,
      perType: stats.perType,
      dirty: false,
    };
    await manifestRef(db).set(next, { merge: true });
    /*
     * 🛑 The mirror belongs on BOTH paths. This one is the manual repair
     * entry point — the one somebody reaches for precisely when the index is
     * wrong — so a rebuild that fixed the artifact and left every browser
     * pointed at the broken version would be the worst possible outcome of
     * running it.
     */
    await publishManifestMirror(getAdminStorage().bucket(), next);
    logger.info("search index FULL rebuild complete", {
      version,
      reads: stats.reads,
      records: artifact.r.length,
      bytes: published.bytes,
      path: storagePathFor(version),
    });
  } catch (err) {
    const e = normalizeError(err);
    logger.error("search index FULL rebuild failed", { message: e.message });
    throw err;
  }
}
