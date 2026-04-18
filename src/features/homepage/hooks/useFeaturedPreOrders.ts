"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  ProductItem,
  ProductListResponse,
} from "@mohasinac/appkit/features/products";

const MIN_COUNT = 12;

export function useFeaturedPreOrders() {
  return useQuery<ProductItem[]>({
    queryKey: ["pre-orders", "featured"],
    queryFn: async () => {
      const featuredRes = await apiClient.get<ProductListResponse>(
        "/api/products?filters=isPreOrder%3D%3Dtrue%2Cstatus%3D%3Dpublished&sorts=preOrderDeliveryDate&pageSize=6",
      );
      const featured = featuredRes?.items ?? [];

      if (featured.length >= MIN_COUNT) return featured;

      const remaining = MIN_COUNT - featured.length;
      const latestRes = await apiClient.get<ProductListResponse>(
        `/api/products?filters=isPreOrder%3D%3Dtrue%2Cstatus%3D%3Dpublished&sorts=-createdAt&pageSize=${remaining + featured.length}`,
      );
      const latest = latestRes?.items ?? [];

      const existingIds = new Set(featured.map((p) => p.id));
      const filler = latest
        .filter((p) => !existingIds.has(p.id))
        .slice(0, remaining);

      return [...featured, ...filler];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
