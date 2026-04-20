import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  EventItem,
  EventEntryListResponse,
  LeaderboardEntry,
} from "../types";
import { EVENT_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseEventOptions<T extends EventItem = EventItem> {
  enabled?: boolean;
  initialData?: EventItem;
  endpoint?: string;
  /**
   * Map the API item to a richer app-level type without forking the package.
   * @example
   * const { event } = useEvent<EventDocument>(id, {
   *   transform: (raw) => ({ ...raw, registrationCount: 0 }),
   * });
   */
  transform?: (item: EventItem) => T;
}

export function useEvent<T extends EventItem = EventItem>(
  id: string,
  opts?: UseEventOptions<T>,
) {
  const endpoint = opts?.endpoint ?? EVENT_ENDPOINTS.BY_ID(id);
  const { data, isLoading, error, refetch } = useQuery<EventItem | null>({
    queryKey: ["event", id],
    queryFn: () => apiClient.get<EventItem>(endpoint),
    enabled: (opts?.enabled ?? true) && !!id,
    initialData: opts?.initialData,
  });

  const event =
    data && opts?.transform ? opts.transform(data) : (data as T | null);

  return {
    event: event ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useEventEntries(
  eventId: string,
  params: { page?: number; pageSize?: number; reviewStatus?: string } = {},
  opts?: { enabled?: boolean; endpoint?: string },
) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.reviewStatus) sp.set("reviewStatus", params.reviewStatus);
  const qs = sp.toString();
  const endpoint = opts?.endpoint ?? `${EVENT_ENDPOINTS.ENTRIES(eventId)}${qs ? `?${qs}` : ""}`;

  const { data, isLoading, error, refetch } = useQuery<EventEntryListResponse>({
    queryKey: ["event-entries", eventId, qs],
    queryFn: () =>
      apiClient.get<EventEntryListResponse>(endpoint),
    enabled: (opts?.enabled ?? true) && !!eventId,
  });

  return {
    entries: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useEventLeaderboard(
  eventId: string,
  limit = 10,
  opts?: { enabled?: boolean; endpoint?: string },
) {
  const { data, isLoading, error } = useQuery<LeaderboardEntry[]>({
    queryKey: ["event-leaderboard", eventId, limit],
    queryFn: () =>
      apiClient.get<LeaderboardEntry[]>(
        EVENT_ENDPOINTS.LEADERBOARD(eventId, limit),
      ),
    enabled: (opts?.enabled ?? true) && !!eventId,
  });

  return {
    leaderboard: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
