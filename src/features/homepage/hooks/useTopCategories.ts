"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CategoryItem } from "../../categories/types";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";

export function useTopCategories(
  limit = 12,
  options?: { initialData?: CategoryItem[] },
) {
  return useQuery<CategoryItem[]>({
    queryKey: ["categories", "top", String(limit)],
    queryFn: () =>
      apiClient.get<CategoryItem[]>(CATEGORY_ENDPOINTS.ROOT(limit)),
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: options?.initialData,
  });
}
