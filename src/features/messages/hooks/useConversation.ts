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
import {
  conversationPingPath,
  userConversationsPingPath,
} from "../realtime";
import { normalizeError } from "../../../errors/normalize";
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

const DETAIL_ENDPOINT = (id: string) =>
  `/api/user/conversations/${encodeURIComponent(id)}`;
const SEND_ENDPOINT = (id: string) =>
  `/api/user/conversations/${encodeURIComponent(id)}/messages`;
const READ_ENDPOINT = (id: string) =>
  `/api/user/conversations/${encodeURIComponent(id)}/read`;

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
  const res = await fetch(DETAIL_ENDPOINT(id), { credentials: "include" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load conversation (${res.status})`);
  const json = (await res.json()) as { data?: ConversationDocument };
  return json.data ?? null;
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
      // toast-intentionally-silent: background refetch, error surfaced via error state
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
    try {
      const unsubscribe = getClientRealtimeProvider().subscribe(
        conversationPingPath(conversationId),
        () => {
          setIsConnected(true);
          void refetch();
        },
        () => setIsConnected(false),
      );
      return () => {
        setIsConnected(false);
        unsubscribe();
      };
    } catch {
      // Realtime provider not registered — falls back to one-shot fetch above.
      setIsConnected(false);
      return undefined;
    }
  }, [conversationId, refetch]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!conversationId) return;
      const trimmed = body.trim();
      if (!trimmed) return;
      const res = await fetch(SEND_ENDPOINT(conversationId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        throw new Error(`Failed to send message (${res.status})`);
      }
      // RTDB ping will trigger refetch — but kick off one immediately in case
      // the ping path isn't subscribed (e.g. provider not registered).
      await refetch();
    },
    [conversationId, refetch],
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await fetch(READ_ENDPOINT(conversationId), {
        method: "POST",
        credentials: "include",
      });
      await refetch();
    } catch {
      // toast-intentionally-silent: read-receipt is best-effort, non-critical
    }
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
