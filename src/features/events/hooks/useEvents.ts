"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { EventItem, EventListResponse, EventListParams } from "../types";
import { EVENT_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseEventsOptions<T extends EventItem = EventItem> {
  enabled?: boolean;
  initialData?: EventListResponse;
  /**
   * Map each API item to a richer app-level type.
   * The API always returns `EventItem`; use this to project it to your own
   * extended type without forking the package.
   *
   * @example
   * const { events } = useEvents<EventDocument>(params, {
   *   transform: (raw) => ({ ...raw, localizedTitle: t(raw.title) }),
   * });
   */
  transform?: (item: EventItem) => T;
}

export function useEvents<T extends EventItem = EventItem>(
  params: EventListParams = {},
  opts?: UseEventsOptions<T>,
) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.type) sp.set("type", params.type);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sort) sp.set("sorts", params.sort);
  if (params.filters) sp.set("filters", params.filters);

  const qs = sp.toString();

  const { data, isLoading, error, refetch } = useQuery<EventListResponse>({
    queryKey: ["events", qs],
    queryFn: () =>
      apiClient.get<EventListResponse>(
        `${EVENT_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`,
      ),
    enabled: opts?.enabled ?? true,
    initialData: opts?.initialData,
  });

  const rawItems = data?.items ?? [];
  const events = (
    opts?.transform ? rawItems.map(opts.transform) : rawItems
  ) as T[];

  return {
    events,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
