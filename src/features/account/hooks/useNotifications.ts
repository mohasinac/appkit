import { useMutation, useQuery } from "@tanstack/react-query";
import { useOptionalSession } from "../../../react/contexts/SessionContext";
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

  /*
   * 🛑 SIGNED-OUT VISITORS WERE POLLING AN AUTH-ONLY ENDPOINT.
   *
   * The interval below was tuned carefully and at length — and the query had
   * no `enabled` gate at all. `TitleBar` mounts this hook on every page, so a
   * signed-out visitor fetched `/api/notifications` on mount and again every
   * five minutes per open tab, collecting a 401 each time. That is the
   * audit's "two 401s fire for signed-out visitors, including a notifications
   * poll that should not run at all", and signed-out is the majority of
   * traffic on a public catalogue.
   *
   * Every one of those was a billed function invocation (Rule #6) spent
   * asking for the unread count of nobody.
   *
   * `useOptionalSession`, not `useSession`: this hook is library code mounted
   * in shared chrome, so it must not require a provider — and with no
   * provider it fails CLOSED, which is the safe direction for a request that
   * can only 401. Same precedent as `useCanSeePrices`.
   *
   * `loading` is deliberately part of the gate. `SessionProvider` mounts
   * `initialUser={null}` (the root layout must stay static), so `user` is
   * null on every hard load until Firebase resolves — firing then would 401
   * for a signed-IN user too, and firing again afterwards would double the
   * request.
   */
  const session = useOptionalSession();
  const isSignedIn = Boolean(session?.user?.uid) && !session?.loading;

  const { data, isLoading, refetch } = useQuery<
    NotificationsResponse<TNotification>
  >({
    enabled: isSignedIn,
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
