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
 * How many rows a multi-term search fetches before refining — D2, Fix 2.
 *
 * 🛑 This is the number that makes multi-word search paginate at all, and it is
 * capped rather than unbounded for Rule #6: one bounded read, never a scan that
 * grows with the collection. 250 is the same ceiling the availability fan-out
 * uses (`PUBLIC_PRODUCT_MAX_PAGE_SIZE` × 5 clauses), for the same reason — it is
 * what a single Firestore page can return without becoming a cost.
 */
export const SEARCH_REFINE_WINDOW = 250;

/**
 * AND-refine the remaining terms, then slice the requested page out.
 *
 * ## 🛑 The bug this closes: multi-word search lied about its own totals
 *
 * This used to filter the ALREADY-PAGINATED page and then set
 * `total = items.length`, `totalPages = 0|1`, `hasMore = false`. Two
 * consequences, both silent:
 *
 *   1. A two-word query could only ever return matches that happened to fall
 *      inside one 50-row window. Rows 51+ that matched both terms were
 *      unreachable — not on page 2, not anywhere, because `hasMore` said there
 *      was no page 2.
 *   2. The pager actively asserted completeness. A search returning 7 of 40
 *      real matches reported "7 results" and disabled Next.
 *
 * Both render as plausible results with a 200, which is why neither was
 * reported: a search that returns seven relevant rows looks like it worked.
 *
 * ## The fix, and its honest cost
 *
 * The caller over-fetches a bounded WINDOW (`SEARCH_REFINE_WINDOW`), this
 * function refines over it and then slices the requested page. So page 2 of a
 * two-word search exists, and `total` is the refined count over the window
 * rather than over one page.
 *
 * 🛑 `truncated` is NOT optional, and it is the part that keeps this honest.
 * When the window saturated, the refined `total` is a FLOOR, not a total — the
 * same situation the availability queries document — so the renderer must show
 * it as "50+" and `totalPages` must offer one more page rather than claiming a
 * false last one. Reporting a saturated window as an exact total is the defect
 * above with a bigger number.
 */
export function refineSearchTxt<
  T extends { searchTxt?: string[] },
  R extends { items: T[]; total: number; totalPages: number; hasMore: boolean },
>(
  result: R,
  rest: string[],
  /**
   * Supply these to get real pagination. Omitted, the behaviour is the old
   * page-only refine — kept so the eleven existing callers are byte-identical
   * until each is converted, rather than all of them changing at once.
   */
  opts?: {
    page: number;
    pageSize: number;
    /** True when the fetch returned a full window, so more may exist. */
    windowSaturated: boolean;
  },
): R & { truncated?: boolean } {
  if (rest.length === 0) return result;
  const matched = result.items.filter((row) => matchesAllSearchTerms(row.searchTxt, rest));

  if (!opts) {
    /*
     * The legacy shape. `total` is this page's count — a floor — and
     * `hasMore: false` is the known post-pagination-filter debt this function
     * carried from the start. Preserved verbatim for unconverted callers.
     */
    return {
      ...result,
      items: matched,
      total: matched.length,
      totalPages: matched.length === 0 ? 0 : 1,
      hasMore: false,
    };
  }

  const page = Math.max(1, Math.floor(opts.page) || 1);
  const pageSize = Math.max(1, Math.floor(opts.pageSize) || 1);
  const start = (page - 1) * pageSize;
  const items = matched.slice(start, start + pageSize);

  /*
   * 🛑 A saturated window means `matched.length` is a FLOOR. `totalPages` then
   * offers `page + 1` rather than the floor's own last page, so the reader can
   * go and look — exactly the convention the availability queries use, where
   * claiming a false last page is worse than admitting the ceiling.
   */
  const truncated = opts.windowSaturated;
  const exactPages = Math.ceil(matched.length / pageSize);
  return {
    ...result,
    items,
    total: matched.length,
    totalPages: truncated ? Math.max(exactPages, page + 1) : exactPages,
    hasMore: truncated ? true : start + items.length < matched.length,
    ...(truncated ? { truncated: true } : {}),
  };
}
