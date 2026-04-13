// ─── Search Shared Types ──────────────────────────────────────────────────────

export interface SearchOptions {
  page?: number;
  perPage?: number;
  filters?: string;
  facets?: string[];
  sortBy?: string;
  /** Attributes to include in the result (default: all) */
  attributesToRetrieve?: string[];
  /** Attributes to highlight in results */
  attributesToHighlight?: string[];
}

export interface SearchHit<T> {
  id: string;
  data: T;
  score?: number;
  highlights?: Record<string, string>;
}

export interface SearchResult<T> {
  hits: SearchHit<T>[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  processingTimeMs?: number;
  facets?: Record<string, Record<string, number>>;
}

export interface SuggestOptions {
  limit?: number;
  filters?: string;
}

// ─── Search Interface ─────────────────────────────────────────────────────────

/**
 * Full-text search adapter contract.
 * Implemented by concrete provider packages (for example, Typesense or Meilisearch).
 */
export interface ISearchProvider<T = Record<string, unknown>> {
  index(id: string, data: T): Promise<void>;
  indexBatch(items: Array<{ id: string; data: T }>): Promise<void>;
  remove(id: string): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult<T>>;
  suggest(query: string, options?: SuggestOptions): Promise<string[]>;
}
