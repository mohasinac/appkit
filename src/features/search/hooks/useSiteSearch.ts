"use client";

/*
 * WHY: One query, one matcher, two surfaces — the header dropdown and
 *      `/search` must not grow separate notions of what matches.
 * WHAT: The client search hook. Runs the browser matcher over the loaded
 *       artifact and returns BOTH shapes: grouped results for the page and
 *       flat suggestion rows for the typeahead.
 *
 * ## 🛑 Synchronous per keystroke, and no debounce
 *
 * There is nothing to debounce — a debounce exists to avoid spending a
 * network round trip per character, and this spends none. `searchIndex` is a
 * linear scan over ~3,700 prepared records, measured sub-millisecond by
 * `verify-search-local.mjs`. Adding a 250 ms debounce here would make the box
 * feel SLOWER than the thing it replaced while costing nothing less.
 *
 * The one thing that is async is loading the artifact, once, and `active`
 * gates that (see `useSearchIndex`).
 *
 * ## 🛑 No minimum query length either
 *
 * `useNavSuggestions` gates at 3 characters because each query is a real
 * Firestore round trip and below that the result is dominated by whatever
 * sorts first. Neither clause holds here: a one-character query costs the
 * same nothing, and the matcher ranks rather than truncates. Typing "d" and
 * seeing something is the behaviour a local index is FOR.
 *
 * ## It returns a result even when the index is not in play
 *
 * `status` distinguishes `idle` / `loading` / `ready` / `failed` / `disabled`,
 * and the last two mean *the caller should fall back*, not *show nothing*.
 * A caller that renders an empty state on `loading` is saying "nothing
 * matched" about a question that has not been asked yet.
 *
 * @tag domain:search
 * @tag layer:feature
 * @tag pattern:hook
 * @tag access:client
 * @tag consumers:Search,SearchResultsClient
 * @tag sideEffects:none
 */

import * as React from "react";

import { searchIndex, type ResolvedEntity } from "../../../_internal/shared/search/match";
import {
  countFacets,
  moreHrefResolver,
  toSearchResult,
  type FacetCount,
} from "../../../_internal/shared/search/to-groups";
import { parseSearchTxtQuery } from "../../../utils/search-txt";
import { useSearchIndex, type SearchIndexStatus } from "./useSearchIndex";
import type { SearchEverythingResult } from "../../../_internal/server/features/search/search-everything";
import type { NavSuggestionRecord } from "./useNavSuggestions";

/**
 * How many hits the matcher is asked for.
 *
 * Generous because grouping happens AFTER: a cap of 20 on a query matching
 * 400 products would starve every other group, since the list is
 * score-ordered and products would fill it. 200 keeps the long tail of types
 * reachable while staying trivial to sort.
 */
const MATCH_LIMIT = 200;

/**
 * `typeKey` -> the five values the header dropdown's icon and badge maps
 * understand.
 *
 * 🛑 A MAPPING rather than a widening of `NavSuggestionRecord["type"]`.
 * That union is public API and is switched on by the dropdown's
 * `DEFAULT_TYPE_ICONS` / `DEFAULT_TYPE_BADGES`; widening it to `string` would
 * compile everywhere and silently render unstyled rows for the 16 index types
 * those maps have never heard of (Root Cause #20). The real key travels
 * alongside, in `typeKey`, for anything that wants it.
 */
function suggestionTypeFor(typeKey: string): NavSuggestionRecord["type"] {
  switch (typeKey) {
    case "blog":
      return "blog";
    case "event":
      return "event";
    case "category":
    case "brand":
    case "franchise":
    case "bundle":
    case "model":
    case "part":
      return "category";
    case "store":
    case "faq":
    case "review":
    case "scammer":
    case "coupon":
    case "group":
      return "page";
    default:
      // Every listing type — product, collector drop, pre-order, … — plus anything
      // added to the index later. A listing is the commonest row and the
      // product icon is the right default for an unknown one.
      return "product";
  }
}

export interface UseSiteSearchOptions {
  /** Flip true on focus or first keypress. Gates the artifact fetch. */
  active: boolean;
  /** `siteSettings.search?.indexEnabled` — read as `!== false`. */
  indexEnabled?: boolean;
  /** Restrict to these index type keys. Absent means every type. */
  types?: readonly string[];
  /** Require every one of these `k:v` pairs. The facet rail's selection. */
  facets?: readonly string[];
  /** `typeKey` -> heading. See `ToGroupsOptions.label`. */
  label: (typeKey: string) => string;
}

export interface UseSiteSearchResult {
  readonly status: SearchIndexStatus;
  /** Null until the index is ready; never a fabricated empty result. */
  readonly result: SearchEverythingResult | null;
  readonly suggestions: readonly NavSuggestionRecord[];
  readonly facets: readonly FacetCount[];
  /** The index build this answered from, for a "results as of" line. */
  readonly builtAt: string | null;
}

export function useSiteSearch(
  query: string,
  { active, indexEnabled, types, facets, label }: UseSiteSearchOptions,
): UseSiteSearchResult {
  const { status, index } = useSearchIndex({ active, indexEnabled });

  /*
   * 🛑 `types` and `facets` are arrays, so a caller passing a literal creates
   * a new identity every render and would re-run the scan on every keystroke
   * of an UNCHANGED filter. Keying the memo on the joined strings makes the
   * dependency structural rather than referential.
   */
  const typeKey = types ? types.join(",") : "";
  const facetKey = facets ? facets.join(",") : "";

  return React.useMemo<UseSiteSearchResult>(() => {
    if (!index) {
      return { status, result: null, suggestions: [], facets: [], builtAt: null };
    }

    const q = query.trim();
    if (!q) {
      return {
        status,
        result: null,
        suggestions: [],
        facets: [],
        builtAt: index.builtAt,
      };
    }

    const hits: readonly ResolvedEntity[] = searchIndex(index.artifact, index.prepared, q, {
      limit: MATCH_LIMIT,
      types: typeKey ? typeKey.split(",") : undefined,
      facets: facetKey ? facetKey.split(",") : undefined,
    });

    /*
     * Terms come from the SAME parser the matcher used, so a query that
     * normalises away ("!!!") reports zero terms and the page can render its
     * "no searchable words" state — which is a different thing from "nothing
     * matched", and the distinction the server tier also draws via
     * `plan.empty`.
     */
    const terms = parseSearchTxtQuery(q);

    return {
      status,
      result: toSearchResult(q, terms, hits, {
        label,
        moreHref: moreHrefResolver(index.artifact),
      }),
      suggestions: hits.slice(0, 8).map((h) => ({
        objectID: h.href,
        type: suggestionTypeFor(h.typeKey),
        typeKey: h.typeKey,
        title: h.title,
        subtitle: h.detail || undefined,
        url: h.href,
      })),
      facets: countFacets(hits),
      builtAt: index.builtAt,
    };
  }, [index, status, query, typeKey, facetKey, label]);
}
