/*
 * WHY: Searching a 3,730-record artifact in the browser, at zero Firestore
 *      reads per keystroke. The action-index route already states the
 *      doctrine this follows: "One request per session per portal, never per
 *      keystroke… a typeahead has to answer in under 16 ms, which a network
 *      hop cannot."
 * WHAT: A pure, isomorphic matcher plus `resolveEntity`, the named primitive
 *       the /tools surfaces call.
 *
 * ## 🛑 ONE normaliser, and it is imported, not reimplemented
 *
 * `normalizeSearchText` is the same function the write path and the Firestore
 * path use. `audit-search-parity`'s R2 exists because a second tokeniser
 * writes tokens the query side cannot match — "and re-running the backfill
 * does NOT fix it". A library would have brought a third; this file must not
 * grow a local lowercase/NFD pipeline. Enforced by that audit.
 *
 * ## Why hand-rolled rather than MiniSearch
 *
 * Three reasons, in order of weight:
 *
 *  1. the normaliser argument above;
 *  2. typo tolerance is already solved at WRITE time with evidence —
 *     `alias-variants` derives its suffix swaps from a crawl of a counterfeit
 *     seller's 1,277 titles, which is better grounded than generic edit
 *     distance and costs nothing at query time;
 *  3. ~3,700 records is below where an inverted index earns its complexity. A
 *     linear scan is a few thousand cheap iterations.
 *
 * 🛑 (3) is a claim with a number attached, and the number is checked —
 * `scripts/verify-search-local.mjs` times it and prints the result. If that
 * ever stops being true, this comment is the thing to come back and delete.
 *
 * ## 🛑 It is NOT BM25 and must not be described as BM25
 *
 * BM25's two moving parts are IDF and length normalisation. Titles here
 * average 20 characters, so length normalisation is degenerate; IDF over one
 * domain mostly re-derives "beyblade is common", which `weight` already
 * encodes. Calling an ordered weight sum "BM25-ish" would be decoration
 * (Root Cause #92). It is a weighted match score, the weights are below, and
 * they are tuned against the verify script.
 *
 * ## What this has that the Firestore path structurally cannot
 *
 * SUBSTRING. `search-txt.ts` states the limit outright: "Word-prefix, not
 * mid-word. 'ariza' will not match 'charizard'." A linear scan gets mid-word
 * for free, which is why Tier 1 is better at its job than Tier 2, not merely
 * cheaper.
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:useSiteSearch,/parts,/tools/price-index,verify-search-local
 * @tag sideEffects:none
 */

import { normalizeSearchText, parseSearchTxtQuery } from "../../../utils/search-txt";
import { aliasVariantsForName } from "./alias-variants";
import { partAliasTokens } from "./part-aliases";
import {
  facetsOf,
  hrefFor,
  REC_DETAIL,
  REC_TITLE,
  REC_TYPE,
  type SearchIndexArtifact,
  type SearchIndexRecord,
} from "./index-record";

/** Field weights. Title dominates; a detail match is corroboration. */
const W_TITLE = 3;
const W_DETAIL = 1;

/** Match-quality weights, highest first. */
const S_EXACT = 100;
const S_PREFIX = 60;
const S_SUBSTRING = 30;
const S_ALIAS = 15;

/** Default cap. A dropdown shows ~6 per group; a page shows more. */
const DEFAULT_LIMIT = 50;

export interface ResolvedEntity {
  /** Index into `artifact.types`. */
  readonly typeIdx: number;
  readonly typeKey: string;
  readonly title: string;
  readonly detail: string;
  readonly href: string;
  readonly score: number;
}

export interface ResolveOptions {
  readonly limit?: number;
  /** Restrict to these type keys. Empty/absent means every type. */
  readonly types?: readonly string[];
  /** Require every one of these `k:v` facet pairs. */
  readonly facets?: readonly string[];
}

/** One record's searchable text, prepared once at load. */
interface Prepared {
  readonly rec: SearchIndexRecord;
  readonly titleWords: readonly string[];
  readonly titleFlat: string;
  readonly detailWords: readonly string[];
  readonly detailFlat: string;
  /** Alias + misspelling forms of the TITLE. See `prepareIndex`. */
  readonly aliasWords: readonly string[];
  readonly aliasFlat: string;
}

/**
 * Prepare an artifact for searching.
 *
 * 🛑 Call this ONCE per artifact, not per query. It normalises every title and
 * detail up front — ~3,700 × 2 `normalizeSearchText` calls, a few milliseconds
 * — so that the per-keystroke path does no allocation beyond the query's own
 * terms. Doing it inside `search` would move that cost onto every keystroke,
 * which is the one thing this design exists to avoid.
 */
export function prepareIndex(artifact: SearchIndexArtifact): readonly Prepared[] {
  return artifact.r.map((rec) => {
    const title = rec[REC_TITLE] ?? "";
    const titleFlat = normalizeSearchText(title);
    const detailFlat = normalizeSearchText(rec[REC_DETAIL] ?? "");
    /*
     * 🛑 The alias corpus is expanded against the DOCUMENT, not the query, and
     * getting this backwards is a real bug I shipped into the first draft.
     *
     * `aliasVariantsForName` is DIRECTIONAL: `doubledLetterVariants` collapses
     * `dragoon -> dragon`, it does not expand `dragon -> dragoon`. The
     * Firestore path works because `buildProductSearchTxt` runs it over the
     * TITLE at write time, so the document carries "dragon" as a token.
     * Expanding the query instead produces nothing for that rule, and the
     * verify script caught it: searching "dragon" found no "Dragoon Storm".
     *
     * So the client does at LOAD what the server does at WRITE — same
     * function, same direction, same result. It also keeps the variants out
     * of the artifact, which is why `index-record.ts` does not carry them.
     *
     * `partAliasTokens` is symmetric (a code <-> name table), so it would have
     * worked either way; it runs here too so there is one rule, not two.
     */
    const aliasSet = new Set<string>();
    for (const v of aliasVariantsForName(title)) aliasSet.add(normalizeSearchText(v));
    for (const v of partAliasTokens(`${title} ${rec[REC_DETAIL] ?? ""}`)) {
      aliasSet.add(normalizeSearchText(v));
    }
    aliasSet.delete(titleFlat); // a variant identical to the title adds nothing
    const aliasFlat = [...aliasSet].filter(Boolean).join(" ");
    return {
      rec,
      titleFlat,
      detailFlat,
      aliasFlat,
      titleWords: titleFlat ? titleFlat.split(" ") : [],
      detailWords: detailFlat ? detailFlat.split(" ") : [],
      aliasWords: aliasFlat ? aliasFlat.split(" ") : [],
    };
  });
}

/** Best match quality for one term against one field. 0 means no match. */
function fieldScore(term: string, words: readonly string[], flat: string): number {
  if (!flat) return 0;
  for (const w of words) if (w === term) return S_EXACT;
  for (const w of words) if (w.startsWith(term)) return S_PREFIX;
  // Mid-word. The capability the token index cannot have.
  if (flat.includes(term)) return S_SUBSTRING;
  return 0;
}

function recordScore(p: Prepared, terms: readonly string[], typeWeight: number): number {
  let total = 0;
  for (const term of terms) {
    /*
     * An alias match is real but WEAKER than a direct one: `S_ALIAS` is the
     * ceiling for that field, so "Dragoon Storm" still outranks a record that
     * only matched through a generated misspelling.
     */
    const aliasHit = fieldScore(term, p.aliasWords, p.aliasFlat) > 0 ? S_ALIAS : 0;
    const best = Math.max(
      fieldScore(term, p.titleWords, p.titleFlat) * W_TITLE,
      fieldScore(term, p.detailWords, p.detailFlat) * W_DETAIL,
      aliasHit,
    );
    // AND semantics: a record missing any term is out, regardless of how well
    // it matched the others. "red dranzer" returning everything with "dranzer"
    // is the exact complaint that made search feel broken.
    if (best === 0) return 0;
    total += best;
  }
  return total * typeWeight;
}

function facetsSatisfied(rec: SearchIndexRecord, required: readonly string[]): boolean {
  if (required.length === 0) return true;
  const have = new Set(facetsOf(rec).map(([k, v]) => `${k}:${v}`));
  return required.every((f) => have.has(f));
}

/**
 * Search a prepared artifact.
 *
 * Returns a flat, score-ordered list. Grouping by type is the caller's job —
 * the dropdown and the results page group differently, and a tool wants
 * neither.
 */
export function searchIndex(
  artifact: SearchIndexArtifact,
  prepared: readonly Prepared[],
  query: string,
  opts: ResolveOptions = {},
): readonly ResolvedEntity[] {
  const terms = parseSearchTxtQuery(query);
  /*
   * 🛑 A query that normalises to nothing returns NOTHING, never everything.
   * "!!!" and "—" have no terms, and treating that as "no filter" is how a
   * punctuation search returns the whole catalogue AS SEARCH RESULTS — the
   * bug A2 fixed on /api/products, and the one `plan.empty` exists for.
   */
  if (terms.length === 0) return [];

  const limit = opts.limit ?? DEFAULT_LIMIT;
  const wantTypes = new Set(opts.types ?? []);
  const facets = opts.facets ?? [];

  const collect = (useTerms: readonly string[], aliasPass: boolean): ResolvedEntity[] => {
    const hits: ResolvedEntity[] = [];
    for (const p of prepared) {
      const type = artifact.types[p.rec[REC_TYPE]];
      if (!type) continue;
      if (wantTypes.size > 0 && !wantTypes.has(type.key)) continue;
      if (!facetsSatisfied(p.rec, facets)) continue;
      const score = recordScore(p, useTerms, type.weight);
      if (score === 0) continue;
      hits.push({
        typeIdx: p.rec[REC_TYPE],
        typeKey: type.key,
        title: p.rec[REC_TITLE],
        detail: p.rec[REC_DETAIL],
        href: hrefFor(artifact, p.rec),
        // An alias hit is a weaker signal than a direct one and must not
        // outrank it when both are present in a later, wider query.
        score: aliasPass ? score - S_ALIAS : score,
      });
    }
    return hits;
  };

  /*
   * ONE pass. The alias forms live on the prepared record (see
   * `prepareIndex`), so there is nothing to retry with — an earlier draft had
   * a second query-expansion pass here and it was both redundant and
   * directionally wrong.
   */
  const hits = collect(terms, false);

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return hits.slice(0, limit);
}

/**
 * The named primitive the tools call.
 *
 * 🛑 `types` is a parameter from day one BECAUSE the tools exist. `/parts`
 * wants parts, the price index wants category leaves, the authenticity
 * typeahead wants canonical models — three consumers, three subsets. Adding
 * the filter later would mean changing every call site that had already been
 * written without it.
 *
 * 🛑 It must NOT be wired into `/tools/authenticity`'s VERDICT path. That
 * engine's fuzzy matching is evidence — a near-miss fires a trademark-evasion
 * warning — and this matcher's alias corpus is built from a counterfeit
 * seller's own spellings. Feeding one into the other would silence the warning
 * by construction. The typeahead may propose a canonical entity; the engine
 * must still analyse what the user actually typed. Enforced by
 * audit-entity-resolver-consumers R2.
 */
export function resolveEntity(
  artifact: SearchIndexArtifact,
  prepared: readonly Prepared[],
  query: string,
  opts: ResolveOptions = {},
): readonly ResolvedEntity[] {
  return searchIndex(artifact, prepared, query, opts);
}

export type { Prepared as PreparedIndex };
