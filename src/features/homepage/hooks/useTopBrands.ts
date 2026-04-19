"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CategoryItem } from "../../categories/types";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";

export function useTopBrands(limit = 12) {
  return useQuery<CategoryItem[]>({
    queryKey: ["categories", "brands", String(limit)],
    queryFn: () =>
      apiClient.get<CategoryItem[]>(CATEGORY_ENDPOINTS.BRANDS(limit)),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
