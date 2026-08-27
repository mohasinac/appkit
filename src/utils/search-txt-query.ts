/*
 * WHY: The READ half of searchTxt, in one place.
 *
 *      Firestore permits ONE array operator per query, so token search is
 *      always the same two-step shape: the most selective term becomes an
 *      `array-contains` clause, and the remaining terms are AND-refined over
 *      the returned page. faqs and products each hand-rolled it, and the
 *      products copy carried a comment promising the refine for a long time
 *      while nothing refined anything — so "red dranzer" returned everything
 *      matching "dranzer".
 *
 *      Two rules are easy to get wrong independently, and both fail silently:
 *
 *        - `array-contains-any` instead of `array-contains` makes a multi-word
 *          search an OR, which reads as "search does nothing".
 *        - a query that produced NO usable term must return NOTHING. Falling
 *          through to an unfiltered list means a 1-character search returns the
 *          whole collection, which also reads as "search does nothing".
 *
 * @tag domain:search
 * @tag layer:util
 * @tag access:isomorphic
 */

import { matchesAllSearchTerms, parseSearchTxtQuery } from "./search-txt";

export interface SearchTxtPlan {
  /** The single term to push down as `array-contains`, or null for no search. */
  head: string | null;
  /** Terms to AND-refine in memory after the query returns. */
  rest: string[];
  /**
   * True when the caller supplied a search string that yielded no usable term.
   * The caller MUST return an empty page rather than an unfiltered one.
   */
  empty: boolean;
}

/**
 * Split a raw search string into the pushdown term and the refine terms.
 * `parseSearchTxtQuery` already orders longest-first — the cheapest proxy for
 * "narrows the most" without cardinality stats.
 */
export function planSearchTxt(search: string | undefined | null): SearchTxtPlan {
  const raw = (search ?? "").trim();
  const terms = parseSearchTxtQuery(raw);
  if (terms.length === 0) {
    return { head: null, rest: [], empty: raw.length > 0 };
  }
  return { head: terms[0], rest: terms.slice(1), empty: false };
}

/** An empty page, shaped like a Sieve result. */
export function emptySearchResult<T>(): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
} {
  return { items: [], total: 0, page: 1, pageSize: 0, totalPages: 0, hasMore: false };
}

/**
 * AND-refine the remaining terms over an already-fetched page.
 *
 * `total` becomes a FLOOR once rows are dropped after the page was cut — it
 * counts this page only. That is the known post-pagination-filter debt, not a
 * new invention: reporting the pre-filter total would promise pages that render
 * empty.
 */
export function refineSearchTxt<
  T extends { searchTxt?: string[] },
  R extends { items: T[]; total: number; totalPages: number; hasMore: boolean },
>(result: R, rest: string[]): R {
  if (rest.length === 0) return result;
  const items = result.items.filter((row) =>
    matchesAllSearchTerms(row.searchTxt, rest),
  );
  return {
    ...result,
    items,
    total: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    hasMore: false,
  };
}
