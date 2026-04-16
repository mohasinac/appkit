"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { FirebaseApp } from "firebase/app";
import { getApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  off,
  type DatabaseReference,
  type Database,
} from "firebase/database";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { logger } from "../../../core";
import { apiClient } from "../../../http";
import { nowMs } from "../../../utils";

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

function resolveFirebaseApp(override?: FirebaseApp): FirebaseApp {
  if (override) return override;
  const apps = getApps();
  return apps.length ? apps[0] : getApp();
}

export function useChat(
  chatId: string | null,
  options?: { realtimeApp?: FirebaseApp; realtimeDb?: Database },
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenExpiresAtRef = useRef<number>(0);
  const msgRefRef = useRef<DatabaseReference | null>(null);
  const listenerRef = useRef<
    ((snap: import("firebase/database").DataSnapshot) => void) | null
  >(null);

  const connectAndSubscribe = useCallback(async () => {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      const shouldRefresh =
        !tokenExpiresAtRef.current ||
        tokenExpiresAtRef.current - nowMs() < 60_000;

      if (shouldRefresh) {
        const tokenResponse = await apiClient.post<{
          customToken: string;
          expiresAt: number;
        }>("/api/realtime/token", {});

        const app = resolveFirebaseApp(options?.realtimeApp);
        const realtimeAuth = getAuth(app);
        await signInWithCustomToken(realtimeAuth, tokenResponse.customToken);
        tokenExpiresAtRef.current = tokenResponse.expiresAt;
      }

      if (msgRefRef.current && listenerRef.current) {
        off(msgRefRef.current, "value", listenerRef.current);
        listenerRef.current = null;
      }

      const database =
        options?.realtimeDb ??
        getDatabase(resolveFirebaseApp(options?.realtimeApp));
      const messagesRef = ref(database, `/chat/${chatId}/messages`);
      msgRefRef.current = messagesRef;

      listenerRef.current = (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val() as Record<string, Omit<ChatMessage, "id">>;
          const parsed: ChatMessage[] = Object.entries(raw)
            .map(([id, msg]) => ({ id, ...msg }))
            .sort((a, b) => a.timestamp - b.timestamp);
          setMessages(parsed);
        } else {
          setMessages([]);
        }
        setIsConnected(true);
        setIsLoading(false);
      };

      onValue(messagesRef, listenerRef.current, (err) => {
        logger.error("Chat RTDB subscription error", err);
        setError("Could not connect to chat. Please try again.");
        setIsConnected(false);
        setIsLoading(false);
      });
    } catch (err) {
      logger.error("Failed to authenticate for chat RTDB", err);
      setError("Failed to connect to chat.");
      setIsLoading(false);
    }
  }, [chatId, options?.realtimeApp, options?.realtimeDb]);

  useEffect(() => {
    connectAndSubscribe();

    return () => {
      if (msgRefRef.current && listenerRef.current) {
        off(msgRefRef.current, "value", listenerRef.current);
        listenerRef.current = null;
        msgRefRef.current = null;
      }
    };
  }, [connectAndSubscribe]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatId || !text.trim()) return;
      await apiClient.post(`/api/chat/${chatId}/messages`, {
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
      apiClient.get<{ rooms: unknown[] }>("/api/chat").then((r) => r.rooms),
  });
}

export function useCreateChatRoom() {
  return useMutation({
    mutationFn: (data: { orderId: string; sellerId: string }) =>
      apiClient.post<{ room: unknown }>("/api/chat", data).then((r) => r.room),
  });
}

export function useDeleteChatRoom() {
  return useMutation({
    mutationFn: (chatId: string) => apiClient.delete(`/api/chat/${chatId}`),
  });
}
