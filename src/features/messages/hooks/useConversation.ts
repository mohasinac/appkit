"use client";
/**
 * useConversation — load + subscribe to a single conversation.
 *
 * Strategy: Firestore is the canonical store; messages live embedded in the
 * conversation document. The realtime layer is a single RTDB "ping" path
 * (`chats/{conversationId}/lastUpdate`) that the send/mark-read API routes
 * bump on every write. This hook subscribes to that ping and re-fetches the
 * doc through the API on each tick. Zero RTDB schema duplication and the
 * canonical Firestore message ordering wins.
 */
import { useCallback, useEffect, useState } from "react";
import { getClientRealtimeProvider } from "../../../contracts/client-realtime";
import { acquireRealtimeSession } from "../../../contracts/realtime-session";
// One scope for both message hooks, deliberately: /api/realtime/token issues a
// SINGLE token covering all of this user's conversationIds, so a per-id scope
// would make the list and the detail hook re-sign against each other on the
// same page for no gain.
//
// 🛑 Known limitation, not fixed here: because the scope is constant, a
// conversation created AFTER sign-in is not in the cached token's claims and
// its subscription is denied until the token's expiry skew forces a re-sign.
// The denial is now surfaced (see the error callback below) rather than
// swallowed. The durable fix is to re-acquire on a permission denial.
const MESSAGES_SCOPE = "messages";
import {
  conversationPingPath,
  userConversationsPingPath,
} from "../realtime";
import { normalizeError } from "../../../errors/normalize";
import { apiClient, ApiClientError } from "../../../http/ApiClient";
import {
  CONVERSATION_ENDPOINTS,
  ADMIN_ENDPOINTS,
} from "../../../constants/api-endpoints";
import type { ConversationDocument } from "../schemas/firestore";

/**
 * @deprecated Re-exported for backwards compat — import `conversationPingPath`
 * from `@mohasinac/appkit` instead.
 */
export const CONVERSATIONS_PING_PATH = conversationPingPath;

/**
 * @deprecated Re-exported for backwards compat — import
 * `userConversationsPingPath` from `@mohasinac/appkit` instead.
 */
export const CONVERSATIONS_PING_USER_PATH = userConversationsPingPath;

const DETAIL_ENDPOINT = CONVERSATION_ENDPOINTS.BY_ID;
const SEND_ENDPOINT = CONVERSATION_ENDPOINTS.MESSAGES;
const READ_ENDPOINT = CONVERSATION_ENDPOINTS.READ;

export interface UseConversationReturn {
  conversation: ConversationDocument | null;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  sendMessage: (body: string) => Promise<void>;
  markRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

async function fetchDetail(id: string): Promise<ConversationDocument | null> {
  try {
    return await apiClient.get<ConversationDocument>(DETAIL_ENDPOINT(id));
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw err;
  }
}

export function useConversation(conversationId: string | null): UseConversationReturn {
  const [conversation, setConversation] = useState<ConversationDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const refetch = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setConversation(await fetchDetail(conversationId));
    } catch (e) {
      void normalizeError(e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!conversationId) {
      setIsConnected(false);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    let release: (() => void) | undefined;
    let cancelled = false;

    // 🛑 Sign in BEFORE subscribing. Without a session `auth == null`, and the
    // `chats/$conversationId` rule requires
    // `auth.token.conversationIds[$conversationId]` — a claim that, until this
    // change, NOTHING issued (the token route only ever sent `chatIds`, from
    // the unrelated `chatRooms` collection). Two stacked faults on one channel:
    // no sign-in, and a claim with no issuer. The recipient of a message never
    // saw it until they manually refreshed; the sender only saw their own
    // because `send()` calls `refetch()` directly.
    void (async () => {
      try {
        const lease = await acquireRealtimeSession(MESSAGES_SCOPE, () =>
          apiClient.post<{ customToken: string; expiresAt: number }>(
            ADMIN_ENDPOINTS.REALTIME_TOKEN,
            {},
          ),
        );
        release = lease.release;
        if (cancelled) {
          release();
          return;
        }
        // Subscribe through the LEASE's provider — it is bound to the app this
        // scope authenticated on. The global provider may be on a different app
        // carrying another channel's claims.
        unsubscribe = lease.provider.subscribe(
          conversationPingPath(conversationId),
          () => {
            setIsConnected(true);
            void refetch();
          },
          (err: unknown) => {
            void normalizeError(err);
            setIsConnected(false);
          },
        );
      } catch (_err) {
        void normalizeError(_err);
        // Provider unregistered or token fetch failed — falls back to the
        // one-shot fetch above.
        setIsConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      setIsConnected(false);
      unsubscribe?.();
      release?.();
    };
  }, [conversationId, refetch]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!conversationId) return;
      const trimmed = body.trim();
      if (!trimmed) return;
      await apiClient.post(SEND_ENDPOINT(conversationId), { body: trimmed });
      // RTDB ping will trigger refetch — but kick off one immediately in case
      // the ping path isn't subscribed (e.g. provider not registered).
      await refetch();
    },
    [conversationId, refetch],
  );

  const markRead = useCallback((): Promise<void> => {
    if (!conversationId) return Promise.resolve();
    return apiClient
      .post(READ_ENDPOINT(conversationId))
      .then(() => void refetch())
      .catch((err: unknown) => void normalizeError(err));
  }, [conversationId, refetch]);

  return {
    conversation,
    isLoading,
    error,
    isConnected,
    sendMessage,
    markRead,
    refetch,
  };
}
