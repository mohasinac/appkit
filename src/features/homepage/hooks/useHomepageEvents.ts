import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { EventItem } from "../../events/types";
import { EVENT_ENDPOINTS } from "../../../constants/api-endpoints";

export interface HomepageEventsListResponse {
  items: EventItem[];
  total: number;
}

export function useHomepageEvents(limit = 6) {
  return useQuery<EventItem[]>({
    queryKey: ["events", "homepage", String(limit)],
    queryFn: async () => {
      const res = await apiClient.get<HomepageEventsListResponse>(
        `${EVENT_ENDPOINTS.LIST}?filters=status%3D%3Dactive&pageSize=${limit}`,
      );
      return res?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
