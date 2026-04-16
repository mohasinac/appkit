"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ProductItem, ProductListResponse } from "../types";

type RelatedProductsResponse = ProductListResponse;

export function useRelatedProducts(
  category: string,
  excludeId: string,
  limit = 8,
  isAuction = false,
) {
  const params = new URLSearchParams({
    filters: `status==published,category==${encodeURIComponent(category)},isAuction==${isAuction}`,
    sorts: "-createdAt",
    pageSize: String(limit),
  });

  return useQuery<RelatedProductsResponse>({
    queryKey: ["related-products", category, excludeId, String(isAuction)],
    queryFn: () =>
      apiClient.get<RelatedProductsResponse>(
        `/api/products?${params.toString()}`,
      ),
    enabled: Boolean(category),
    staleTime: 5 * 60 * 1000,
  });
}
