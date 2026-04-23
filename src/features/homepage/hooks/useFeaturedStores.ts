import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { StoreListItem, StoreListResponse } from "../../stores/types";
import { STORE_ENDPOINTS } from "../../../constants/api-endpoints";

export function useFeaturedStores(limit = 8) {
  return useQuery<StoreListItem[]>({
    queryKey: ["stores", "featured", String(limit)],
    queryFn: async () => {
      const res = await apiClient.get<StoreListResponse>(
        `${STORE_ENDPOINTS.LIST}?pageSize=${limit}&sort=-averageRating`,
      );
      return res?.items ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
