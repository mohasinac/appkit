"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type { CategoryItem } from "@mohasinac/feat-categories";

export function useTopBrands(limit = 12) {
  return useQuery<CategoryItem[]>({
    queryKey: ["categories", "brands", String(limit)],
    queryFn: () =>
      apiClient.get<CategoryItem[]>(
        `/api/categories?isBrand=true&pageSize=${limit}`,
      ),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
