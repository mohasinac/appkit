import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CategoryItem } from "../../categories/types";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";

export function useTopBrands(
  limit = 12,
  options?: { initialData?: CategoryItem[] },
) {
  return useQuery<CategoryItem[]>({
    queryKey: ["categories", "brands", String(limit)],
    initialData: options?.initialData,
    queryFn: () =>
      apiClient.get<CategoryItem[]>(CATEGORY_ENDPOINTS.BRANDS(limit)),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
