"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CategoryItem } from "../../categories";

export function useBrands(
  endpoint = "/api/categories?isBrand=true&pageSize=100",
) {
  const { data, isLoading } = useQuery<CategoryItem[]>({
    queryKey: ["categories", "brands", endpoint],
    queryFn: () => apiClient.get<CategoryItem[]>(endpoint),
    staleTime: 15 * 60 * 1000,
  });

  const brands = useMemo(() => data ?? [], [data]);
  const brandOptions = useMemo(
    () => brands.map((b) => ({ value: b.id, label: b.name })),
    [brands],
  );

  return { brands, brandOptions, isLoading };
}
