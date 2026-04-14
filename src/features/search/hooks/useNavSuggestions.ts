"use client";

import { useEffect, useRef, useState } from "react";

export interface NavSuggestionRecord {
  objectID: string;
  type: "page" | "category" | "blog" | "event";
  title: string;
  subtitle?: string;
  url: string;
}

export function useNavSuggestions(query: string, debounceMs = 250) {
  const [suggestions, setSuggestions] = useState<NavSuggestionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        setSuggestions([]);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  return { suggestions, isLoading };
}
