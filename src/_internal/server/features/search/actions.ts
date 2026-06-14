"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { searchProducts } from "../../../../features/search/actions/search-actions";
import type { SearchQuery } from "../../../../features/search/types";

/**
 * Server action for client-initiated search (debounced as-you-type).
 * Bypasses React.cache() so each call returns fresh results.
 */
export async function searchAction(query: SearchQuery): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
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
  });
}
