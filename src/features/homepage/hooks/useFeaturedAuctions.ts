import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  ProductItem,
  ProductListResponse,
} from "@mohasinac/appkit/features/products";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

const MIN_COUNT = 12;

export function useFeaturedAuctions() {
  return useQuery<ProductItem[]>({
    queryKey: ["auctions", "featured"],
    queryFn: async () => {
      const promotedRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?filters=isAuction%3D%3Dtrue%2Cstatus%3D%3Dpublished%2CisPromoted%3D%3Dtrue&pageSize=18`,
      );
      const promoted = promotedRes?.items ?? [];

      if (promoted.length >= MIN_COUNT) return promoted;

      const remaining = MIN_COUNT - promoted.length;
      const latestRes = await apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}?filters=isAuction%3D%3Dtrue%2Cstatus%3D%3Dpublished&sorts=-createdAt&pageSize=${remaining + promoted.length}`,
      );
      const latest = latestRes?.items ?? [];

      const existingIds = new Set(promoted.map((a) => a.id));
      const filler = latest
        .filter((a) => !existingIds.has(a.id))
        .slice(0, remaining);

      return [...promoted, ...filler];
    },
    staleTime: 30_000,
    gcTime: 2 * 60 * 1000,
  });
}
