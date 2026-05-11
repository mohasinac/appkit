"use client";
/**
 * useConversations — list the current buyer's conversations. Subscribes to a
 * single RTDB ping path so the list refreshes whenever any of the user's
 * conversations gets a new message.
 */
import { useCallback, useEffect, useState } from "react";
import { getClientRealtimeProvider } from "../../../contracts/client-realtime";
import { userConversationsPingPath } from "../realtime";
import type { ConversationDocument } from "../schemas/firestore";

const LIST_ENDPOINT = "/api/user/conversations";

export interface UseConversationsReturn {
  conversations: ConversationDocument[];
  isLoading: boolean;
  error: Error | null;
  totalUnread: number;
  refetch: () => Promise<void>;
}

async function fetchList(): Promise<ConversationDocument[]> {
  const res = await fetch(LIST_ENDPOINT, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load conversations (${res.status})`);
  const json = (await res.json()) as { data?: { items?: ConversationDocument[] } };
  return json.data?.items ?? [];
}

export function useConversations(userId: string | null | undefined): UseConversationsReturn {
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
      setConversations(await fetchList());
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Subscribe to the per-user ping path — any send/mark-read in any of the
  // user's conversations bumps this and triggers a fresh list fetch.
  useEffect(() => {
    if (!userId) return;
    try {
      const unsubscribe = getClientRealtimeProvider().subscribe(
        userConversationsPingPath(userId),
        () => {
          void refetch();
        },
        () => {
          // ignore — list will refresh on next focus / explicit refetch
        },
      );
      return unsubscribe;
    } catch {
      // Realtime provider not registered — non-fatal; list still works.
      return undefined;
    }
  }, [userId, refetch]);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadBuyer ?? 0),
    0,
  );

  return { conversations, isLoading, error, totalUnread, refetch };
}
