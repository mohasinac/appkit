import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { NOTIFICATIONS_ENDPOINTS } from "../../../constants/api-endpoints";
import type { JsonValue } from "@mohasinac/appkit";

export interface BaseNotificationItem {
  id: string;
  read?: boolean;
  [key: string]: JsonValue | undefined;
}

export interface NotificationsResponse<TNotification = any> {
  notifications: TNotification[];
  unreadCount: number;
}

/**
 * Poll cadence for the notification badge. See the comment at the
 * `refetchInterval` below for why this is minutes rather than seconds.
 */
const NOTIFICATIONS_POLL_MS = 5 * 60_000;

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
    staleTime: NOTIFICATIONS_POLL_MS,
    // Notifications originate server-side (order/bid/moderation events) with
    // no client-driven local-first path to short-circuit, unlike cart/wishlist,
    // so the badge does need a poll rather than a local-first read.
    //
    // 🛑 This hook is mounted in TitleBar, i.e. on EVERY page of the site, so
    // its interval is multiplied by every open tab of every signed-in user for
    // as long as those tabs exist — it is wall-clock, not activity-gated, so a
    // tab left open overnight keeps firing. At the original 30s that was 120
    // invocations/hour/tab for an unread COUNT, and it was a material share of
    // the Vercel function-invocation spend that paused the account (2026-09-14).
    //
    // 5 minutes + refetch-on-focus is the trade: a user who is actually looking
    // at the tab gets a fresh badge the moment they return to it, and an
    // abandoned tab costs 12 invocations/hour instead of 120.
    refetchInterval: NOTIFICATIONS_POLL_MS,
    // The global QueryClient default is `refetchOnWindowFocus: false`
    // (src/app/[locale]/QueryProvider.tsx). Opt back in HERE specifically,
    // because it is what makes the longer interval acceptable rather than
    // simply slower.
    refetchOnWindowFocus: true,
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
