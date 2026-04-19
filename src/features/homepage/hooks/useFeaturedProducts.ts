"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ProductListResponse } from "../../products/types";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

const MIN_COUNT = 12;

export function useFeaturedProducts(options?: {
  initialData?: ProductListResponse;
}) {
  return useQuery<ProductListResponse>({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const promotedRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?filters=isPromoted%3D%3Dtrue%2Cstatus%3D%3Dpublished&pageSize=18`,
      );
      const promoted = promotedRes?.items ?? [];

      if (promoted.length >= MIN_COUNT) return promotedRes;

      const remaining = MIN_COUNT - promoted.length;
      const latestRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?filters=status%3D%3Dpublished&sorts=-createdAt&pageSize=${remaining + promoted.length}`,
      );
      const latest = latestRes?.items ?? [];

      const existingIds = new Set(promoted.map((p) => p.id));
      const filler = latest
        .filter((p) => !existingIds.has(p.id))
        .slice(0, remaining);

      const merged = [...promoted, ...filler];
      return {
        ...promotedRes,
        items: merged,
        total: merged.length,
      };
    },
    initialData: options?.initialData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
