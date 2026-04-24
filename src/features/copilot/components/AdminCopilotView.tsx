"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Div,
  Heading,
  Input,
  Span,
  StackedViewShell,
  Text,
} from "../../../ui";
import { apiClient } from "../../../http";
import { useCopilotChat } from "../hooks/useCopilotChat";
import type { CopilotMessage } from "../hooks/useCopilotChat";
import { THEME_CONSTANTS } from "../../../tokens";

export interface AdminCopilotViewProps {
  endpoint?: string;
  historyEndpoint?: string;
  renderHeader?: (onNewConversation: () => void) => React.ReactNode;
  labels?: {
    title?: string;
    newConversation?: string;
    noMessages?: string;
    noMessagesDesc?: string;
    inputPlaceholder?: string;
    sendButton?: string;
    sendingButton?: string;
    errorLabel?: string;
    conversationId?: string;
    loadConversation?: string;
    historyTitle?: string;
  };
  className?: string;
}

function MessageBubble({ msg }: { msg: CopilotMessage }) {
  const isUser = msg.role === "user";
  return (
    <Div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-neutral-100 dark:bg-slate-700 text-neutral-900 dark:text-neutral-100 rounded-tl-sm"
        }`}
      >
        <Text className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</Text>
        {msg.durationMs ? (
          <Span className="mt-1 block text-xs opacity-60">{(msg.durationMs / 1000).toFixed(1)}s</Span>
        ) : null}
      </Div>
    </Div>
  );
}

export function AdminCopilotView({
  endpoint,
  historyEndpoint = "/api/copilot/history",
  renderHeader,
  labels = {},
  className = "",
}: AdminCopilotViewProps) {
  const [input, setInput] = useState("");
  const [conversationInput, setConversationInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    conversationId,
    sendMessage,
    startNewConversation,
    loadConversation,
    isLoading,
    error,
  } = useCopilotChat({ endpoint });

  const historyQuery = useQuery<{
    messages: Array<{ prompt: string; response: string; createdAt: string }>;
  }>({
    queryKey: ["copilot-history", historyEndpoint, conversationId],
    queryFn: () =>
      apiClient.get<{
        messages: Array<{ prompt: string; response: string; createdAt: string }>;
      }>(`${historyEndpoint}?conversationId=${encodeURIComponent(conversationId)}`),
    staleTime: 15_000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <StackedViewShell
      portal="admin"
      title={labels.title ?? "AI Copilot"}
      className={className}
      sections={[
        renderHeader ? (
          renderHeader(startNewConversation)
        ) : (
          <Div className="flex items-center justify-between gap-3">
            <Heading level={2}>{labels.title ?? "AI Copilot"}</Heading>
            <Button type="button" variant="outline" size="sm" onClick={startNewConversation}>
              {labels.newConversation ?? "New Conversation"}
            </Button>
          </Div>
        ),
        <Div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
          <Div className="flex flex-col rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 h-[calc(100vh-300px)]">
            <Div className="border-b border-neutral-200 dark:border-slate-700 p-3">
              <Text className="text-xs font-medium text-neutral-500 dark:text-zinc-400">
                {labels.conversationId ?? "Conversation ID"}: {conversationId}
              </Text>
            </Div>

            <Div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <Div className="flex flex-col items-center justify-center h-full text-center">
                  <Text className="font-medium">{labels.noMessages ?? "No messages yet"}</Text>
                  <Text variant="secondary" className="text-sm mt-1">
                    {labels.noMessagesDesc ?? "Ask anything to get started"}
                  </Text>
                </Div>
              ) : null}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isLoading ? (
                <Div className="flex justify-start">
                  <Div className="rounded-2xl rounded-tl-sm bg-neutral-100 dark:bg-slate-700 px-4 py-2.5">
                    <Span className="text-sm opacity-60 animate-pulse">Thinking...</Span>
                  </Div>
                </Div>
              ) : null}
              {error ? (
                <Text className="text-center text-sm text-red-500">
                  {labels.errorLabel ?? "An error occurred. Please try again."}
                </Text>
              ) : null}
              <div ref={messagesEndRef} />
            </Div>

            <Div className="border-t border-neutral-200 dark:border-slate-700 p-3">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={labels.inputPlaceholder ?? "Ask anything..."}
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:ring-2 ring-primary/20 transition disabled:opacity-60"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading || !input.trim()}
                  className="shrink-0"
                >
                  {isLoading ? labels.sendingButton ?? "Sending..." : labels.sendButton ?? "Send"}
                </Button>
              </form>
            </Div>
          </Div>

          <Div className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
            <Heading level={3} className="text-sm font-semibold">
              {labels.historyTitle ?? "Conversation History"}
            </Heading>
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!conversationInput.trim()) return;
                loadConversation(conversationInput.trim());
              }}
            >
              <Input
                label={labels.conversationId ?? "Conversation ID"}
                value={conversationInput}
                onChange={(event) => setConversationInput(event.target.value)}
                placeholder="conv_..."
              />
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                {labels.loadConversation ?? "Load conversation"}
              </Button>
            </form>

            {historyQuery.error ? (
              <Alert variant="warning" title="History unavailable">
                {historyQuery.error instanceof Error ? historyQuery.error.message : "Could not load history"}
              </Alert>
            ) : null}

            <Div className="max-h-72 overflow-y-auto space-y-2">
              {(historyQuery.data?.messages ?? []).map((log, index) => (
                <Div
                  key={`${log.createdAt}-${index}`}
                  className="rounded-lg border border-neutral-200 dark:border-slate-700 p-2"
                >
                  <Text className="text-xs font-medium text-neutral-500 dark:text-zinc-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                  <Text className={`text-sm mt-1 ${THEME_CONSTANTS.utilities.textClamp3}`}>Q: {log.prompt}</Text>
                  <Text className={`text-sm mt-1 ${THEME_CONSTANTS.utilities.textClamp3} text-neutral-600 dark:text-zinc-300`}>
                    A: {log.response}
                  </Text>
                </Div>
              ))}
              {!historyQuery.isLoading && (historyQuery.data?.messages?.length ?? 0) === 0 ? (
                <Text variant="secondary" className="text-sm">
                  No server history found for this conversation yet.
                </Text>
              ) : null}
            </Div>
          </Div>
        </Div>,
      ]}
    />
  );
}
