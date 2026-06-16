"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Div, Heading, Input, Row, Span, Stack, StackedViewShell, Text } from "../../../ui";
import { apiClient } from "../../../http";
import { useCopilotChat } from "../hooks/useCopilotChat";
import type { CopilotMessage } from "../hooks/useCopilotChat";

const __P = {
  p3: "p-3",
  p4: "p-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

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

const LBL_CONVERSATION_ID = "Conversation ID";
const CLS_ERROR_TEXT = "text-center text-sm text-error";

function MessageBubble({ msg }: { msg: CopilotMessage }) {
  const isUser = msg.role === "user";
  return (
    <Div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Div
        className={`max-w-[80%] py-2.5 text-sm ${ isUser ? "bg-primary text-white rounded-tr-sm" : "bg-neutral-100 dark:bg-slate-700 text-neutral-900 dark:text-neutral-100 rounded-tl-sm" }`} padding="x-md" rounded="2xl"
      >
        <Text className="whitespace-pre-wrap leading-relaxed" size="sm">{msg.content}</Text>
        {msg.durationMs ? (
          <Span size="xs" className="mt-1 block opacity-60">{(msg.durationMs / 1000).toFixed(1)}s</Span>
        ) : null}
      </Div>
    </Div>
  );
}

type CopilotLabels = AdminCopilotViewProps["labels"] & object;

function renderCopilotChatPanel(props: {
  messages: CopilotMessage[]; conversationId: string; isLoading: boolean; error: unknown;
  input: string; setInput: (v: string) => void; labels: CopilotLabels;
  messagesEndRef: React.RefObject<HTMLDivElement>; handleSubmit: (e: React.FormEvent) => void;
}) {
  const { messages, conversationId, isLoading, error, input, setInput, labels, messagesEndRef, handleSubmit } = props;
  return (
    <Stack className="border border-neutral-200 h-[calc(100vh-300px)]" surface="default" rounded="xl">
      <Div className={`border-b border-neutral-200 dark:border-slate-700 ${__P.p3}`}>
        <Text className="text-neutral-500" size="xs" weight="medium">
          {labels?.conversationId ?? LBL_CONVERSATION_ID}: {conversationId}
        </Text>
      </Div>
      <Stack className={`flex-1 ${__O.yAuto} ${__P.p4}`} gap="md">
        {messages.length === 0 ? (
          <Stack className="justify-center h-full text-center" align="center">
            <Text weight="medium">{labels?.noMessages ?? "No messages yet"}</Text>
            <Text variant="secondary" className="mt-1" size="sm">{labels?.noMessagesDesc ?? "Ask anything to get started"}</Text>
          </Stack>
        ) : null}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        {isLoading ? (
          <Row justify="start">
            <Div className="rounded-tl-sm bg-neutral-100 py-2.5" padding="x-md" rounded="2xl">
              <Span size="sm" className="opacity-60 animate-pulse">Thinking...</Span>
            </Div>
          </Row>
        ) : null}
        {error ? <Text className={CLS_ERROR_TEXT}>{labels?.errorLabel ?? "An error occurred. Please try again."}</Text> : null}
        <Div ref={messagesEndRef} />
      </Stack>
      <Div className={`border-t border-neutral-200 dark:border-slate-700 ${__P.p3}`}>
        {/* audit-raw-form-input-ok: chat input — single field, no validation, Enter-to-submit semantics */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          {/* audit-raw-form-input-ok: chat input */}
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={labels?.inputPlaceholder ?? "Ask anything..."} disabled={isLoading} className="flex-1 h-10 rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:ring-2 ring-primary/20 transition disabled:opacity-60" />
          <Button type="submit" variant="primary" disabled={isLoading || !input.trim()} className="shrink-0">
            {isLoading ? labels?.sendingButton ?? "Sending..." : labels?.sendButton ?? "Send"}
          </Button>
        </form>
      </Div>
    </Stack>
  );
}

function renderCopilotHistoryPanel(props: {
  historyQuery: { data?: { messages: Array<{ prompt: string; response: string; createdAt: string }> }; error: unknown; isLoading: boolean };
  conversationInput: string; setConversationInput: (v: string) => void;
  loadConversation: (id: string) => void; labels: CopilotLabels;
}) {
  const { historyQuery, conversationInput, setConversationInput, loadConversation, labels } = props;
  return (
    <Stack surface="card" padding="sm" gap="3">
      <Heading level={3} size="sm" weight="semibold">{labels?.historyTitle ?? "Conversation History"}</Heading>
      {/* audit-raw-form-input-ok: conversation-id loader — single field, no validation */}
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (!conversationInput.trim()) return; loadConversation(conversationInput.trim()); }}>
        <Input label={labels?.conversationId ?? LBL_CONVERSATION_ID} value={conversationInput} onChange={(e) => setConversationInput(e.target.value)} placeholder="conv_..." />
        <Button type="submit" variant="secondary" size="sm" className="w-full">{labels?.loadConversation ?? "Load conversation"}</Button>
      </form>
      {historyQuery.error ? (
        <Alert variant="warning" title="History unavailable">{historyQuery.error instanceof Error ? historyQuery.error.message : "Could not load history"}</Alert>
      ) : null}
      <Stack className={`max-h-72 ${__O.yAuto}`} gap="sm">
        {(historyQuery.data?.messages ?? []).map((log, index) => (
          <Div key={`${log.createdAt}-${index}`} className="border border-neutral-200" rounded="lg" padding="xs">
            <Text className="text-neutral-500" size="xs" weight="medium">{new Date(log.createdAt).toLocaleString()}</Text>
            <Text className={`mt-1`} truncate={3} size="sm">Q: {log.prompt}</Text>
            <Text className={`mt-1 text-neutral-600 dark:text-zinc-300`} truncate={3} size="sm">A: {log.response}</Text>
          </Div>
        ))}
        {!historyQuery.isLoading && (historyQuery.data?.messages?.length ?? 0) === 0 ? (
          <Text variant="secondary" size="sm">No server history found for this conversation yet.</Text>
        ) : null}
      </Stack>
    </Stack>
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
          <Row align="center" justify="between" gap="3">
            <Heading level={2}>{labels.title ?? "AI Copilot"}</Heading>
            <Button type="button" variant="outline" size="sm" onClick={startNewConversation}>
              {labels.newConversation ?? "New Conversation"}
            </Button>
          </Row>
        ),
        <Div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
          <Stack className="border border-neutral-200 h-[calc(100vh-300px)]" surface="default" rounded="xl">
            <Div className={`border-b border-neutral-200 dark:border-slate-700 ${__P.p3}`}>
              <Text className="text-neutral-500" size="xs" weight="medium">
                {labels.conversationId ?? LBL_CONVERSATION_ID}: {conversationId}
              </Text>
            </Div>

            <Stack className={`flex-1 ${__O.yAuto} ${__P.p4}`} gap="md">
              {messages.length === 0 ? (
                <Stack className="justify-center h-full text-center" align="center">
                  <Text weight="medium">{labels.noMessages ?? "No messages yet"}</Text>
                  <Text variant="secondary" className="mt-1" size="sm">
                    {labels.noMessagesDesc ?? "Ask anything to get started"}
                  </Text>
                </Stack>
              ) : null}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isLoading ? (
                <Row justify="start">
                  <Div className="rounded-tl-sm bg-neutral-100 py-2.5" padding="x-md" rounded="2xl">
                    <Span size="sm" className="opacity-60 animate-pulse">Thinking...</Span>
                  </Div>
                </Row>
              ) : null}
              {error ? (
                <Text className={CLS_ERROR_TEXT}>
                  {labels.errorLabel ?? "An error occurred. Please try again."}
                </Text>
              ) : null}
              <Div ref={messagesEndRef} />
            </Stack>

            <Div className={`border-t border-neutral-200 dark:border-slate-700 ${__P.p3}`}>
              {/* audit-raw-form-input-ok: chat input — single field, no validation, Enter-to-submit semantics */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                {/* audit-raw-form-input-ok: chat input */}
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
          </Stack>

          <Stack surface="card" padding="sm" gap="3">
            <Heading level={3} size="sm" weight="semibold">
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
                label={labels.conversationId ?? LBL_CONVERSATION_ID}
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

            <Stack className={`max-h-72 ${__O.yAuto}`} gap="sm">
              {(historyQuery.data?.messages ?? []).map((log, index) => (
                <Div
                  key={`${log.createdAt}-${index}`}
                  className="border border-neutral-200" rounded="lg" padding="xs"
                >
                  <Text className="text-neutral-500" size="xs" weight="medium">
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                  <Text className={`mt-1`} truncate={3} size="sm">Q: {log.prompt}</Text>
                  <Text className={`mt-1 text-neutral-600 dark:text-zinc-300`} truncate={3} size="sm">
                    A: {log.response}
                  </Text>
                </Div>
              ))}
              {!historyQuery.isLoading && (historyQuery.data?.messages?.length ?? 0) === 0 ? (
                <Text variant="secondary" size="sm">
                  No server history found for this conversation yet.
                </Text>
              ) : null}
            </Stack>
          </Stack>
        </Div>,
      ]}
    />
  );
}
