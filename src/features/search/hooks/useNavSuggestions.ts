"use client";
import { useEffect, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";

export interface NavSuggestionRecord {
  objectID: string;
  type: "page" | "category" | "blog" | "event" | "product";
  title: string;
  subtitle?: string;
  url: string;
}

const SUGGESTIONS_ENDPOINT = "/api/search/suggestions";

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
          params.set("type", selectedType);
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
