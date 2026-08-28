"use client";
/**
 * useConversations — list the current buyer's conversations. Subscribes to a
 * single RTDB ping path so the list refreshes whenever any of the user's
 * conversations gets a new message.
 */
import { useCallback, useEffect, useState } from "react";
import { getClientRealtimeProvider } from "../../../contracts/client-realtime";
import { acquireRealtimeSession } from "../../../contracts/realtime-session";
import { userConversationsPingPath } from "../realtime";
import type { ConversationDocument } from "../schemas/firestore";
import { normalizeError } from "../../../errors/normalize";
import { apiClient } from "../../../http/ApiClient";
import { CONVERSATION_ENDPOINTS, ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const LIST_ENDPOINT = CONVERSATION_ENDPOINTS.LIST;

export interface UseConversationsOptions {
  /** Override the list endpoint — e.g. the seller-scoped /api/store/conversations. Defaults to the buyer endpoint. */
  endpoint?: string;
  /** Which per-conversation unread counter to sum into totalUnread. Defaults to "unreadBuyer". */
  unreadField?: "unreadBuyer" | "unreadSeller";
}

export interface UseConversationsReturn {
  conversations: ConversationDocument[];
  isLoading: boolean;
  error: Error | null;
  totalUnread: number;
  refetch: () => Promise<void>;
}

async function fetchList(endpoint: string): Promise<ConversationDocument[]> {
  const data = await apiClient.get<{ items?: ConversationDocument[] }>(endpoint);
  return data.items ?? [];
}

export function useConversations(
  userId: string | null | undefined,
  opts: UseConversationsOptions = {},
): UseConversationsReturn {
  const { endpoint = LIST_ENDPOINT, unreadField = "unreadBuyer" } = opts;
  const [conversations, setConversations] = useState<ConversationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setConversations(await fetchList(endpoint));
    } catch (e) {
      void normalizeError(e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [userId, endpoint]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Subscribe to the per-user ping path — any send/mark-read in any of the
  // user's conversations bumps this and triggers a fresh list fetch.
  useEffect(() => {
    if (!userId) return;
    let unsubscribe: (() => void) | undefined;
    let release: (() => void) | undefined;
    let cancelled = false;

    // 🛑 Sign in BEFORE subscribing. This hook used to call subscribe() with no
    // authenticated session at all, so `auth == null` and the
    // `chats/user/$userId` rule (`auth.uid == $userId`) could never pass. Every
    // update was permission-denied and the error handler below was a literal
    // `// ignore`, so the whole live-list channel was inert while looking wired.
    void (async () => {
      try {
        release = await acquireRealtimeSession("messages", () =>
          apiClient.post<{ customToken: string; expiresAt: number }>(
            ADMIN_ENDPOINTS.REALTIME_TOKEN,
            {},
          ),
        );
        if (cancelled) {
          release?.();
          return;
        }
        unsubscribe = getClientRealtimeProvider().subscribe(
          userConversationsPingPath(userId),
          () => {
            void refetch();
          },
          (err: unknown) => {
            // Surfaced, not ignored. A denied subscription is a real defect and
            // silence here is what hid it for months.
            void normalizeError(err);
          },
        );
      } catch (_err) {
        void normalizeError(_err);
        // Provider unregistered or token fetch failed — non-fatal; the list
        // still works via the one-shot fetch above, just without live updates.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      release?.();
    };
  }, [userId, refetch]);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c[unreadField] ?? 0),
    0,
  );

  return { conversations, isLoading, error, totalUnread, refetch };
}
