"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { SearchResponse, SearchCategoryOption } from "../types";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseSearchOptions {
  initialCategories?: SearchCategoryOption[];
  categoriesEndpoint?: string;
  searchEndpoint?: string;
}

/**
 * useSearch
 * Fetches search results via GET /api/search.
 * `searchParams` is a pre-built URLSearchParams string produced by the component.
 * `options.initialCategories` — server-prefetched category list for filter facets.
 */
export function useSearch(searchParams: string, options?: UseSearchOptions) {
  const categoriesEndpoint = options?.categoriesEndpoint ?? CATEGORY_ENDPOINTS.FLAT;
  const { data: categories } = useQuery<SearchCategoryOption[]>({
    queryKey: ["search", "categories"],
    queryFn: () =>
      apiClient.get<SearchCategoryOption[]>(categoriesEndpoint),
    initialData: options?.initialCategories,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const searchEndpoint = options?.searchEndpoint ?? `/api/search?${searchParams}`;
  const { data: searchData, isLoading } = useQuery<SearchResponse>({
    queryKey: ["search", searchParams],
    queryFn: () => apiClient.get<SearchResponse>(searchEndpoint),
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
