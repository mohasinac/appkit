import { liteClient } from "algoliasearch/lite";

import { ALGOLIA_PAGES_INDEX_NAME, type AlgoliaNavRecord } from "./nav";

const PUBLIC_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? "";

export { ALGOLIA_PAGES_INDEX_NAME };
export type { AlgoliaNavRecord };

export function isAlgoliaBrowserConfigured(): boolean {
  return Boolean(PUBLIC_APP_ID && SEARCH_KEY);
}

let browserClient: ReturnType<typeof liteClient> | null = null;

function getAlgoliaBrowserClient(): ReturnType<typeof liteClient> | null {
  if (!isAlgoliaBrowserConfigured()) return null;
  if (!browserClient) {
    browserClient = liteClient(PUBLIC_APP_ID, SEARCH_KEY);
  }
  return browserClient;
}

export async function searchNavPages(
  query: string,
  limit = 6,
): Promise<AlgoliaNavRecord[]> {
  const client = getAlgoliaBrowserClient();
  if (!client || !query.trim()) return [];
  const response = await client.search<AlgoliaNavRecord>({
    requests: [
      {
        indexName: ALGOLIA_PAGES_INDEX_NAME,
        query,
        hitsPerPage: limit,
      },
    ],
  });
  const result = response.results[0] as { hits: AlgoliaNavRecord[] };
  return result.hits;
}
