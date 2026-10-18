/*
 * WHY: Turn the public collections into one small artifact the browser can
 *      search locally, WITHOUT the read cost that makes the obvious version
 *      impossible.
 * WHAT: Full and incremental builds, plus the stats a caller must log.
 *
 * ## 🛑 THE READ BUDGET IS THE DESIGN. Read this before changing the cadence.
 *
 * Firestore bills **per document read regardless of `select()`** — projection
 * cuts egress, not read count. So the naive version, a full rebuild every 15
 * minutes, is `96 × 3,730 ≈ 358,000 reads/day` against a **50,000/day** free
 * tier. Seven times over, for a feature nobody asked to be expensive. Hourly
 * is still ~89,000.
 *
 * Hence two modes:
 *
 *   idle        manifest says not dirty               1 read       ~90/day
 *   incremental `updatedAt > lastBuiltAt` per source  13 + changed ~200/day
 *   full        everything; reconciles hard deletes   3,730        3,730/day
 *
 * ≈ 4,000 reads/day, about 8% of the tier.
 *
 * 🛑 A lone `INDEX_UPDATED_AT_FIELD` range clause needs NO composite index — Firestore
 * auto-creates single-field ascending ones — so this cannot produce the
 * swallowed `FAILED_PRECONDITION` of Root Cause #59. Every document extends
 * `BaseDocument`, which declares `updatedAt`, so coverage is structural rather
 * than per-collection luck.
 *
 * ## Unpublish vs hard delete — different mechanisms, say which is which
 *
 * **Unpublish is handled incrementally.** A product flipped `published ->
 * draft` still has a fresh `updatedAt`, so the builder re-reads it, finds it
 * fails the source's filter, and REMOVES it from the artifact within the
 * cadence. That is the case that matters, because it is the one that happens.
 *
 * **A hard delete is invisible to an `updatedAt` query** and is reconciled by
 * the daily full pass. Worst case is a dead link for up to 24 h, which is link
 * rot rather than disclosure. Tombstone machinery would be real complexity for
 * the rarer half of a split that can be described in two sentences.
 *
 * @tag domain:search
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:searchIndexBuild
 * @tag sideEffects:firestore-read
 */

import { normalizeError } from "../../../../../errors/normalize";
import { serverLogger } from "../../../../../monitoring/server-logger";
import { hidePublicTestData } from "../../tester/visibility";
import {
  INDEX_TYPES,
  PUBLIC_INDEX_SOURCES,
  typeIndexFor,
  type IndexDocData,
  type IndexSource,
} from "./sources";
import {
  INDEX_UPDATED_AT_FIELD,
  SEARCH_INDEX_SCHEMA_VERSION,
  type SearchIndexArtifact,
  type SearchIndexRecord,
} from "../../../../shared/search/index-record";

/** The minimal Firestore surface this module needs, so it stays testable. */
interface BuildQuery {
  where(field: string, op: string, value: unknown): BuildQuery;
  select(...fields: string[]): BuildQuery;
  get(): Promise<{ docs: Array<{ id: string; data(): IndexDocData }> }>;
}
interface BuildDb {
  collection(name: string): BuildQuery;
}

export interface BuildStats {
  readonly mode: "full" | "incremental";
  /** Documents READ. This is the number that has to stay inside the budget. */
  readonly reads: number;
  readonly perType: Readonly<Record<string, number>>;
  /** Documents read but rejected by `toRecord` — unpublished, unjoinable, … */
  readonly dropped: number;
  readonly durationMs: number;
}

export interface BuildResult {
  readonly artifact: SearchIndexArtifact;
  readonly stats: BuildStats;
}

/** A record keyed for patching. `${typeKey}:${slug}` is stable across builds. */
type Keyed = Readonly<Record<string, SearchIndexRecord>>;

/** A projected document plus its id, in a shape `hidePublicTestData` accepts. */
type IndexRow = IndexDocData & { isTestData?: boolean; __id: string };

/**
 * The patch key, derived from the source's own `slugOf` so the REMOVE path and
 * the ADD path cannot disagree — and so re-keying a previous artifact (which
 * has only the slug) lands on the same string.
 */
function typeKeyFor(source: IndexSource, d: IndexDocData): string {
  return source.typeKeyOf ? source.typeKeyOf(d) : source.typeKey;
}

function keyOf(source: IndexSource, id: string, d: IndexDocData): string | null {
  const slug = source.slugOf(id, d);
  return slug ? `${typeKeyFor(source, d)}:${slug}` : null;
}

async function readSource(
  db: BuildDb,
  source: IndexSource,
  since: Date | null,
): Promise<{ docs: Array<{ id: string; data(): IndexDocData }>; reads: number }> {
  let q: BuildQuery = db.collection(source.collection);
  for (const [field, value] of source.where ?? []) q = q.where(field, "==", value);
  /*
   * 🛑 The incremental clause is applied INSTEAD OF nothing, not in addition
   * to a page limit. An unbounded `updatedAt >` on a quiet collection returns
   * a handful of rows; on a reseed it returns everything, which is correct —
   * a reseed genuinely did change everything.
   */
  if (since) q = q.where(INDEX_UPDATED_AT_FIELD, ">", since);
  const snap = await q.select(...source.select, "isTestData", INDEX_UPDATED_AT_FIELD).get();
  /*
   * Firestore bills a minimum of one read for a query that matches nothing,
   * so an idle incremental pass still costs one per source. Counting it is
   * the difference between a budget and a guess.
   */
  return { docs: snap.docs, reads: Math.max(1, snap.docs.length) };
}

function toRecords(
  source: IndexSource,
  docs: ReadonlyArray<{ id: string; data(): IndexDocData }>,
): { kept: Array<[string, SearchIndexRecord]>; removed: string[]; dropped: number } {
  const kept: Array<[string, SearchIndexRecord]> = [];
  const removed: string[] = [];
  let dropped = 0;

  /*
   * 🛑 `hidePublicTestData` is NOT optional here, and this call site differs
   * from every other one. Elsewhere a sandbox row that slips through is shown
   * to one viewer on one render. Here it is baked into a shared, immutable,
   * CDN-cached body and published to everyone for the life of that version.
   */
  /*
   * 🛑 An INTERSECTION, not a cast. `IndexDocData` is `Record<string,
   * unknown>`, whose index signature makes `isTestData` an `unknown` and so
   * fails `TestDataFlagged`. The lazy fix is `as any`, which would also
   * silence the fact that `hidePublicTestData` is generic and preserves the
   * row type — including `__id`, which the loop below needs. Naming the shape
   * keeps both ends type-checked.
   */
  const rows: IndexRow[] = docs.map((d) => ({ ...d.data(), __id: d.id }));
  const visible = hidePublicTestData(rows);

  for (const row of visible) {
    const id = row.__id;
    const key = keyOf(source, id, row);
    // No derivable slug means no href and no stable identity — such a row
    // cannot be a search result at all, so it is dropped rather than keyed
    // under something invented.
    if (!key) {
      dropped++;
      continue;
    }
    const rec = source.toRecord(id, row);
    if (!rec) {
      dropped++;
      // A document that fails `toRecord` on an INCREMENTAL pass is usually a
      // row that just became non-public — so it must be removed, not ignored.
      removed.push(key);
      continue;
    }
    /*
     * 🛑 Resolved per DOCUMENT, not per source. `products` holds all nine
     * listing types and each has its own detail route, so a single type index
     * for the collection would send every auction to /products/{slug} —
     * Root Cause #48, rebuilt.
     */
    const typeKey = typeKeyFor(source, row);
    const typeIdx = typeIndexFor(typeKey);
    if (typeIdx < 0) {
      dropped++;
      continue;
    }
    const slug = key.slice(typeKey.length + 1);
    const tuple: SearchIndexRecord =
      rec.facets === undefined
        ? [typeIdx, rec.title, rec.detail, slug]
        : [typeIdx, rec.title, rec.detail, slug, rec.facets];
    kept.push([key, tuple]);
  }
  return { kept, removed, dropped };
}

function envelope(version: number, keyed: Keyed, builtAt: Date): SearchIndexArtifact {
  return {
    schema: SEARCH_INDEX_SCHEMA_VERSION,
    version,
    builtAt: builtAt.toISOString(),
    types: INDEX_TYPES,
    // Sorted by key so two builds over identical data produce identical bytes,
    // which is what makes "did anything actually change" answerable.
    r: Object.keys(keyed)
      .sort()
      .map((k) => keyed[k] as SearchIndexRecord),
  };
}

/**
 * Build from scratch. Reconciles hard deletes by construction, because the
 * result contains exactly what the sources currently return.
 */
export async function buildFull(
  db: BuildDb,
  version: number,
  now: Date = new Date(),
): Promise<BuildResult> {
  const started = Date.now();
  const keyed: Record<string, SearchIndexRecord> = {};
  const perType: Record<string, number> = {};
  let reads = 0;
  let dropped = 0;

  for (const source of PUBLIC_INDEX_SOURCES) {
    try {
      const { docs, reads: r } = await readSource(db, source, null);
      reads += r;
      const out = toRecords(source, docs);
      for (const [k, rec] of out.kept) {
        keyed[k] = rec;
        const tk = INDEX_TYPES[rec[0]]?.key ?? source.typeKey;
        perType[tk] = (perType[tk] ?? 0) + 1;
      }
      dropped += out.dropped;
    } catch (err) {
      const e = normalizeError(err);
      /*
       * 🛑 A failing source does NOT silently shrink the artifact. A full
       * build that quietly omits `products` would publish a search index
       * missing a third of the site and report success — the exact shape of
       * every silent-degradation bug this codebase keeps recording.
       */
      serverLogger.error("searchIndexBuild: source failed during FULL build — aborting", {
        source: source.typeKey,
        collection: source.collection,
        error: e.message,
      });
      throw err;
    }
  }

  return {
    artifact: envelope(version, keyed, now),
    stats: {
      mode: "full",
      reads,
      perType,
      dropped,
      durationMs: Date.now() - started,
    },
  };
}

/**
 * Patch the previous artifact with everything that changed since it was built.
 *
 * 🛑 A source that fails here is logged and SKIPPED, not fatal — unlike the
 * full build. The difference is what the failure costs: a skipped incremental
 * source leaves that type's records at their previous (correct, slightly
 * stale) values and the next pass picks them up, whereas a skipped full source
 * would delete the type from the artifact entirely.
 */
export async function buildIncremental(
  db: BuildDb,
  previous: SearchIndexArtifact,
  since: Date,
  version: number,
  now: Date = new Date(),
): Promise<BuildResult> {
  const started = Date.now();

  // Re-key the previous artifact. The tuple carries no id, so the key is
  // rebuilt from type + slug — which is why `slug` must be stable per record.
  const keyed: Record<string, SearchIndexRecord> = {};
  for (const rec of previous.r) {
    const key = keyFromRecord(rec);
    if (key) keyed[key] = rec;
  }

  const perType: Record<string, number> = {};
  let reads = 0;
  let dropped = 0;

  for (const source of PUBLIC_INDEX_SOURCES) {
    try {
      const { docs, reads: r } = await readSource(db, source, since);
      reads += r;
      const out = toRecords(source, docs);
      for (const k of out.removed) delete keyed[k];
      for (const [k, rec] of out.kept) keyed[k] = rec;
      perType[source.typeKey] = out.kept.length;
      dropped += out.dropped;
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("searchIndexBuild: source failed during INCREMENTAL build — skipped", {
        source: source.typeKey,
        collection: source.collection,
        error: e.message,
      });
    }
  }

  return {
    artifact: envelope(version, keyed, now),
    stats: {
      mode: "incremental",
      reads,
      perType,
      dropped,
      durationMs: Date.now() - started,
    },
  };
}

/**
 * Re-key a record from a previous artifact. Mirrors `keyOf` — both sides key
 * on `${typeKey}:${slug}`, which is the invariant that makes an incremental
 * patch REPLACE a changed row rather than add a second copy of it.
 */
export function keyFromRecord(rec: SearchIndexRecord): string | null {
  const type = INDEX_TYPES[rec[0]];
  return type ? `${type.key}:${rec[3]}` : null;
}
