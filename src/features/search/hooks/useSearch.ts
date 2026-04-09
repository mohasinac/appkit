"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type { SearchResponse, SearchCategoryOption } from "../types";

interface UseSearchOptions {
  initialCategories?: SearchCategoryOption[];
}

/**
 * useSearch
 * Fetches search results via GET /api/search.
 * `searchParams` is a pre-built URLSearchParams string produced by the component.
 * `options.initialCategories` — server-prefetched category list for filter facets.
 */
export function useSearch(searchParams: string, options?: UseSearchOptions) {
  const { data: categories } = useQuery<SearchCategoryOption[]>({
    queryKey: ["search", "categories"],
    queryFn: () =>
      apiClient.get<SearchCategoryOption[]>("/api/categories?flat=true"),
    initialData: options?.initialCategories,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const { data: searchData, isLoading } = useQuery<SearchResponse>({
    queryKey: ["search", searchParams],
    queryFn: () => apiClient.get<SearchResponse>(`/api/search?${searchParams}`),
    enabled: searchParams.length > 0,
    placeholderData: (prev) => prev,
  });

  return {
    results: searchData ?? null,
    items: searchData?.items ?? [],
    total: searchData?.total ?? 0,
    totalPages: searchData?.totalPages ?? 0,
    isLoading,
    categories: categories ?? [],
  };
}
