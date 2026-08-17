"use client";
import { useEffect, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { SEARCH_ENDPOINTS } from "../../../constants/api-endpoints";

export interface NavSuggestionRecord {
  objectID: string;
  type: "page" | "category" | "blog" | "event" | "product";
  title: string;
  subtitle?: string;
  url: string;
}

const SUGGESTIONS_ENDPOINT = SEARCH_ENDPOINTS.SUGGESTIONS;

/**
 * /api/search/suggestions only understands the 4 content categories it can
 * actually produce typeahead rows for (singular: product/category/blog/event)
 * — it has no dedicated suggestion category for the other 10 SearchResourceType
 * values (auctions, stores, brands, …). Map the ones it does support; for
 * everything else, omit `type` entirely so the endpoint returns its
 * unfiltered "all" set rather than zero results. Previously this sent the
 * plural resource-type value verbatim (e.g. "products", the search bar's
 * own default), which matched none of the route's singular checks and made
 * every default-state search return empty suggestions.
 */
const SUGGESTION_TYPE_PARAM_MAP: Record<string, string> = {
  products: "product",
  categories: "category",
  blog: "blog",
  events: "event",
};

/**
 * W1-19 — wired to `/api/search/suggestions` 2026-05-23. Fetches up to 20
 * matches (5 per resource type) and surfaces them as typeahead rows.
 */
export function useNavSuggestions(
  query: string,
  selectedType?: string,
  debounceMs = 250,
) {
  const [suggestions, setSuggestions] = useState<NavSuggestionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (selectedType && selectedType !== "all") {
          const mappedType = SUGGESTION_TYPE_PARAM_MAP[selectedType];
          if (mappedType) params.set("type", mappedType);
        }
        const res = await fetch(
          `${SUGGESTIONS_ENDPOINT}?${params.toString()}`,
          { signal: ctrl.signal, credentials: "same-origin" },
        );
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const body = (await res.json()) as {
          data?: { suggestions?: NavSuggestionRecord[] };
          suggestions?: NavSuggestionRecord[];
        };
        const items = body.data?.suggestions ?? body.suggestions ?? [];
        setSuggestions(items);
      } catch (err) {
        void normalizeError(err);
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, selectedType, debounceMs]);

  return { suggestions, isLoading };
}
