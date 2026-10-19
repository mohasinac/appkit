/*
 * WHY: Tier 1 and Tier 2 must render through the SAME component, or the page
 *      grows two layouts that drift.
 * WHAT: `ResolvedEntity[]` (browser matcher) -> `SearchGroup[]` (the shape
 *       `SearchResultsPageView` already renders), plus facet counting.
 *
 * ## 🛑 Written against the server's types, not beside them
 *
 * `SearchGroup` / `SearchHit` / `SearchEverythingResult` are declared in
 * `_internal/server/features/search/search-everything.ts` and imported here
 * as TYPES ONLY — erased at runtime, so nothing of the server reaches a
 * browser bundle. `SearchResultsPageView` already does exactly this, so the
 * boundary is established rather than invented here.
 *
 * Defining a parallel `LocalSearchGroup` would have been the easy call and
 * the wrong one: two near-identical result shapes is how a page ends up with
 * two renderers, and then a fix to one of them (Root Cause #59's shape).
 *
 * ## 🛑 `truncated` is FALSE here, and that is a real difference
 *
 * The server tier reads a bounded window per collection, so a saturated fetch
 * makes its count a FLOOR and it must render "6+". Tier 1 holds the entire
 * corpus in memory, so the count is EXACT — there is no window to saturate.
 * Reporting `truncated: true` because a group was capped for DISPLAY would be
 * a different claim ("there may be more we could not see") and a false one.
 * `total` carries the real figure; `hits` is the slice shown.
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:useSiteSearch,SearchResultsClient
 * @tag sideEffects:none
 */

import type {
  SearchEverythingResult,
  SearchGroup,
  SearchHit,
} from "../../server/features/search/search-everything";
import type { ResolvedEntity } from "./match";
import type { SearchIndexArtifact } from "./index-record";

/** Rows shown per group before "see all". Matches the server tier's PER_GROUP. */
export const LOCAL_PER_GROUP = 6;

export interface ToGroupsOptions {
  readonly perGroup?: number;
  /**
   * `typeKey` -> human heading. REQUIRED, and the artifact deliberately does
   * not carry it: a label baked into a shared immutable artifact cannot be
   * translated, and this app is `[locale]`-routed. The caller resolves it
   * through the label system at render time.
   */
  readonly label: (typeKey: string) => string;
  /** `typeKey` -> the type's browse page, from the artifact's type table. */
  readonly moreHref: (typeKey: string) => string;
}

/**
 * Group score-ordered hits by type, preserving the order the types first
 * appear in.
 *
 * 🛑 Group ORDER follows the best hit in each group, not the type table's
 * `weight`. Weight already biased the scores; applying it again as an
 * ordering key would double-count it, and a query that matched one FAQ
 * exactly would still rank a weak product match above it.
 */
export function toSearchGroups(
  hits: readonly ResolvedEntity[],
  opts: ToGroupsOptions,
): SearchGroup[] {
  const perGroup = opts.perGroup ?? LOCAL_PER_GROUP;
  const order: string[] = [];
  const byType = new Map<string, ResolvedEntity[]>();

  for (const hit of hits) {
    let bucket = byType.get(hit.typeKey);
    if (!bucket) {
      bucket = [];
      byType.set(hit.typeKey, bucket);
      order.push(hit.typeKey);
    }
    bucket.push(hit);
  }

  return order.map((typeKey) => {
    const bucket = byType.get(typeKey) ?? [];
    const groupHits: SearchHit[] = bucket.slice(0, perGroup).map((h) => ({
      /*
       * The href IS the identity here. The artifact has no document id — it
       * carries a slug, and two types can share a destination (a model
       * composition and its category leaf both render `/categories/{s}`),
       * which the matcher already dedupes on. Using the same key keeps the
       * two consistent; inventing `${typeKey}:${slug}` would give the same
       * row two identities depending on which layer you asked.
       */
      id: h.href,
      title: h.title,
      href: h.href,
      detail: h.detail || undefined,
    }));
    return {
      key: typeKey,
      label: opts.label(typeKey),
      hits: groupHits,
      truncated: false, // see the header — the count is exact, not a floor
      moreHref: opts.moreHref(typeKey),
    };
  });
}

/** Assemble the full result envelope the page component expects. */
export function toSearchResult(
  q: string,
  terms: readonly string[],
  hits: readonly ResolvedEntity[],
  opts: ToGroupsOptions,
): SearchEverythingResult {
  const groups = toSearchGroups(hits, opts);
  return {
    q,
    terms: [...terms],
    groups,
    /*
     * The TOTAL matched, not the total shown. A page that says "24 results"
     * and renders 12 because each group capped at 6 is lying in the direction
     * that matters least; one that says "12" when 24 matched hides half the
     * corpus from someone deciding whether to refine.
     */
    totalHits: hits.length,
  };
}

export interface FacetCount {
  readonly key: string;
  readonly value: string;
  readonly count: number;
}

/**
 * Count facet values across a result set.
 *
 * ## 🛑 This is the thing the server tier structurally cannot afford
 *
 * `BaseRepository.facetCounts` runs ONE aggregation query per facet value,
 * each needing its own composite index, and on a missing index it logs and
 * returns `undefined` so the facet "stays visible" with no count. Here it is
 * a `reduce` over an array already in memory: zero queries, zero indexes, and
 * a count that cannot silently fail.
 *
 * Counts are over the hits the CURRENT query produced, so ticking one facet
 * and watching the others shrink is truthful rather than an approximation of
 * the whole catalogue.
 */
export function countFacets(hits: readonly ResolvedEntity[]): FacetCount[] {
  const tally = new Map<string, number>();
  for (const hit of hits) {
    if (!hit.facets) continue;
    for (const pair of hit.facets.split("|")) {
      // Guard the shape rather than trusting it: a malformed pair is one
      // record's problem, not a reason to drop the whole rail.
      if (pair.indexOf(":") > 0) tally.set(pair, (tally.get(pair) ?? 0) + 1);
    }
  }
  const out: FacetCount[] = [];
  for (const [pair, count] of tally) {
    const i = pair.indexOf(":");
    out.push({ key: pair.slice(0, i), value: pair.slice(i + 1), count });
  }
  // Commonest first within a key, then alphabetical — a rail ordered by raw
  // string would bury the useful refinement below the rare ones.
  out.sort((a, b) => a.key.localeCompare(b.key) || b.count - a.count || a.value.localeCompare(b.value));
  return out;
}

/** Look up a type's `moreHref` from the artifact's own table. */
export function moreHrefResolver(
  artifact: Pick<SearchIndexArtifact, "types">,
): (typeKey: string) => string {
  const map = new Map(artifact.types.map((t) => [t.key, t.moreHref]));
  return (typeKey) => map.get(typeKey) ?? "/";
}
