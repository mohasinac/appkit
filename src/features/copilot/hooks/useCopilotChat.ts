import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { COPILOT_ENDPOINTS } from "../../../constants/api-endpoints";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  durationMs?: number;
}

export interface CopilotChatResponse {
  response: string;
  durationMs?: number;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface UseCopilotChatOptions {
  endpoint?: string;
}

export function useCopilotChat(options?: UseCopilotChatOptions) {
  const endpoint = options?.endpoint ?? COPILOT_ENDPOINTS.CHAT;
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [conversationId, setConversationId] = useState(generateConversationId);

  const mutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiClient.post<{
        success: boolean;
        data: CopilotChatResponse;
      }>(endpoint, { prompt, conversationId });
      return res.data;
    },
    onMutate: (prompt) => {
      const userMsg: CopilotMessage = {
        id: generateId(),
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
    },
    onSuccess: (data) => {
      const aiMsg: CopilotMessage = {
        id: generateId(),
        role: "assistant",
        content: data.response,
        createdAt: new Date().toISOString(),
        durationMs: data.durationMs,
      };
      setMessages((prev) => [...prev, aiMsg]);
    },
  });

  const sendMessage = useCallback(
    (prompt: string) => {
      if (!prompt.trim()) return;
      mutation.mutate(prompt);
    },
    [mutation],
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(generateConversationId());
  }, []);

  return {
    messages,
    sendMessage,
    startNewConversation,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
