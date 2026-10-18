/*
 * WHY: The public search index is one artifact fetched once per visitor and
 *      searched in the browser, so its shape is a wire format — every field
 *      costs bytes on every download, and every field that can be DERIVED
 *      instead of stored should be.
 * WHAT: The record tuple, the type table, and the artifact envelope. Shared by
 *       the builder (server) and the matcher (browser) so the two cannot drift.
 *
 * ## 🛑 Why a tuple and not an object
 *
 * 3,730 records. An object repeats its keys on every row; a tuple does not.
 * Measured on the real corpus: 373 KB raw / 63 KB gzip / 46 KB brotli as
 * tuples. The readability cost is paid once, here, by naming the positions.
 *
 * ## What is deliberately ABSENT, and why each
 *
 *   href        derivable from `types[typeIdx].hrefTemplate`
 *   normalised  derived once at load with the SAME `normalizeSearchText` the
 *   title       write path uses — storing it would be a second copy of a
 *               string we already ship
 *   tokens      derived by calling the SAME `aliasVariantsForName` /
 *               `partAliasTokens` that are already in the bundle. Shipping
 *               them would duplicate a corpus the client already has
 *   label       🛑 NOT on the type table. A human-readable group heading baked
 *               into the artifact is untranslatable, and this app is
 *               `[locale]`-routed with every other UI string going through the
 *               label system. The client maps `key` -> label at render time
 *   price       § Guest price gating is a CLIENT gate; it reaches the rendered
 *               DOM and nothing else. This artifact is unauthenticated and
 *               immutable-cached, so no gate can reach it — an amount here is
 *               published to everyone, permanently, for that version
 *   PII         same argument, one step worse. Includes blind-index digests: a
 *               deterministic per-person identifier is cross-referenceable
 *               even unbroken
 *
 * The last two are enforced, not merely documented — see
 * scripts/audit-search-index-artifact.mjs.
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:index-build,match,verify-search-local
 * @tag sideEffects:none
 */

/**
 * Bumped when the tuple or the envelope changes shape.
 *
 * 🛑 The client REFUSES an artifact whose schema it does not recognise and
 * falls back to the server path, rather than rendering a half-understood one.
 * That is why this is in the envelope and not implied by the URL.
 */
export const SEARCH_INDEX_SCHEMA_VERSION = 1;

/** One searchable kind. The artifact carries the table so the client needs no map. */
export interface SearchIndexType {
  /** Stable key — `product`, `category`, `part`, … Also the i18n label key. */
  readonly key: string;
  /** `"/products/{s}"` — exactly one substitution, `{s}`, the record's slug. */
  readonly hrefTemplate: string;
  /** The indexable browse page, for the group's "see all" footer. */
  readonly moreHref: string;
  /** Type-level ranking nudge. A product outranks a review for the same score. */
  readonly weight: number;
}

/** Tuple positions, named once so no call site indexes by magic number. */
export const REC_TYPE = 0;
export const REC_TITLE = 1;
export const REC_DETAIL = 2;
export const REC_SLUG = 3;
export const REC_FACETS = 4;

/**
 * `[typeIdx, title, detail, slug, facets?]`
 *
 * `facets` is a compact pipe-joined string (`"lt:auction|br:takara-tomy"`) and
 * is absent rather than empty when a record has none — an omitted trailing
 * element costs two bytes, `""` costs four, times 3,730.
 */
export type SearchIndexRecord = readonly [
  number,
  string,
  string,
  string,
  string?,
];

export interface SearchIndexArtifact {
  readonly schema: number;
  /** Monotonic build number. The artifact is addressed by it and immutable. */
  readonly version: number;
  readonly builtAt: string;
  readonly types: readonly SearchIndexType[];
  readonly r: readonly SearchIndexRecord[];
}

/** Resolve a record's destination from the type table. */
export function hrefFor(
  artifact: Pick<SearchIndexArtifact, "types">,
  rec: SearchIndexRecord,
): string {
  const type = artifact.types[rec[REC_TYPE]];
  if (!type) return "/";
  return type.hrefTemplate.replace("{s}", rec[REC_SLUG]);
}

/**
 * Parse the compact facet string into pairs.
 *
 * Returns an empty array for an absent or malformed field rather than
 * throwing: a facet is a refinement, and a record whose facets cannot be read
 * is still a record somebody should be able to find.
 */
export function facetsOf(rec: SearchIndexRecord): ReadonlyArray<readonly [string, string]> {
  const raw = rec[REC_FACETS];
  if (!raw) return [];
  const out: Array<readonly [string, string]> = [];
  for (const part of raw.split("|")) {
    const i = part.indexOf(":");
    if (i > 0) out.push([part.slice(0, i), part.slice(i + 1)] as const);
  }
  return out;
}
