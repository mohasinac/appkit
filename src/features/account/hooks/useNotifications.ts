import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { NOTIFICATIONS_ENDPOINTS } from "../../../constants/api-endpoints";

export interface BaseNotificationItem {
  id: string;
  read?: boolean;
  [key: string]: unknown;
}

export interface NotificationsResponse<TNotification = any> {
  notifications: TNotification[];
  unreadCount: number;
}

export interface UseNotificationsOptions {
  notificationsEndpoint?: string;
  readAllEndpoint?: string;
  readEndpoint?: (id: string) => string;
}

export function useNotifications<TNotification = any>(
  limit = 10,
  options?: UseNotificationsOptions,
) {
  const notificationsEndpoint =
    options?.notificationsEndpoint ?? NOTIFICATIONS_ENDPOINTS.LIST;
  const readAllEndpoint =
    options?.readAllEndpoint ?? NOTIFICATIONS_ENDPOINTS.READ_ALL;
  const readEndpoint = options?.readEndpoint ?? NOTIFICATIONS_ENDPOINTS.BY_ID;

  const { data, isLoading, refetch } = useQuery<
    NotificationsResponse<TNotification>
  >({
    queryKey: ["notifications", "list", String(limit)],
    queryFn: () =>
      apiClient.get<NotificationsResponse<TNotification>>(
        `${notificationsEndpoint}?limit=${limit}`,
      ),
    staleTime: 30_000,
  });

  const { mutate: markRead } = useMutation<unknown, Error, string>({
    mutationFn: (id) => apiClient.patch(readEndpoint(id), {}),
    onSuccess: () => refetch(),
  });

  const { mutate: markAllRead, isPending: isMarkingAll } = useMutation<
    unknown,
    Error,
    void
  >({
    mutationFn: () => apiClient.patch(readAllEndpoint, {}),
    onSuccess: () => refetch(),
  });

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    refetch,
    markRead,
    markAllRead,
    isMarkingAll,
  };
}
