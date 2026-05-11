import { cache } from "react";
import { searchProducts } from "../../../../features/search/actions/search-actions";
import type { SearchQuery } from "../../../../features/search/types";

/**
 * SSR-compatible search read — deduplicated per request via React.cache().
 * Used by the /search page to pre-render results without a client fetch.
 */
export const getSearchResults = cache(
  async (query: SearchQuery) => {
    return searchProducts(query).catch(() => ({
      items: [],
      q: query.q ?? "",
      total: 0,
      page: 1,
      pageSize: query.pageSize ?? 20,
      totalPages: 0,
      hasMore: false,
      backend: "in-memory" as const,
    }));
  },
);
