"use client"
import { useEffect, useState, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getClientRealtimeProvider,
  type IClientRealtimeProvider,
  type Unsubscribe,
} from "../../../contracts/client-realtime";
import { logger } from "../../../core/Logger";
import { apiClient } from "../../../http";
import { nowMs } from "../../../utils";
import {
  ADMIN_ENDPOINTS,
  CHAT_ENDPOINTS,
} from "../../../constants/api-endpoints";

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useChat(
  chatId: string | null,
  options?: { realtimeProvider?: IClientRealtimeProvider },
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenExpiresAtRef = useRef<number>(0);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  const connectAndSubscribe = useCallback(async () => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    const provider = options?.realtimeProvider ?? getClientRealtimeProvider();

    try {
      const shouldRefresh =
        !tokenExpiresAtRef.current ||
        tokenExpiresAtRef.current - nowMs() < 60_000;

      if (shouldRefresh) {
        const tokenResponse = await apiClient.post<{
          customToken: string;
          expiresAt: number;
        }>(ADMIN_ENDPOINTS.REALTIME_TOKEN, {});

        await provider.signInWithToken(tokenResponse.customToken);
        tokenExpiresAtRef.current = tokenResponse.expiresAt;
      }

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      unsubscribeRef.current = provider.subscribe(
        `/chat/${chatId}/messages`,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<
              string,
              Omit<ChatMessage, "id">
            >;
            const parsed: ChatMessage[] = Object.entries(raw)
              .map(([id, msg]) => ({ id, ...msg }))
              .sort((a, b) => a.timestamp - b.timestamp);
            setMessages(parsed);
          } else {
            setMessages([]);
          }
          setIsConnected(true);
          setIsLoading(false);
        },
        (err) => {
          logger.error("Chat RTDB subscription error", err);
          setError("Could not connect to chat. Please try again.");
          setIsConnected(false);
          setIsLoading(false);
        },
      );
    } catch (err) {
      logger.error("Failed to authenticate for chat RTDB", err);
      setError("Failed to connect to chat.");
      setIsLoading(false);
    }
  }, [chatId, options?.realtimeProvider]);

  useEffect(() => {
    connectAndSubscribe();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [connectAndSubscribe]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatId || !text.trim()) return;
      await apiClient.post(CHAT_ENDPOINTS.MESSAGES(chatId), {
        message: text.trim(),
      });
    },
    [chatId],
  );

  return { messages, sendMessage, isConnected, isLoading, error };
}

export function useChatRooms() {
  return useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () =>
      apiClient
        .get<{ rooms: unknown[] }>(CHAT_ENDPOINTS.LIST)
        .then((r) => r.rooms),
  });
}

export function useCreateChatRoom() {
  return useMutation({
    mutationFn: (data: { orderId: string; sellerId: string }) =>
      apiClient
        .post<{ room: unknown }>(CHAT_ENDPOINTS.LIST, data)
        .then((r) => r.room),
  });
}

export function useDeleteChatRoom() {
  return useMutation({
    mutationFn: (chatId: string) =>
      apiClient.delete(CHAT_ENDPOINTS.BY_ID(chatId)),
  });
}
