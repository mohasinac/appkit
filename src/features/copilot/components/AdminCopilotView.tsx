"use client"
import React, { useState, useRef, useEffect } from "react";
import { Button, Div, Heading, Span, Text } from "../../../ui";
import { useCopilotChat } from "../hooks/useCopilotChat";
import type { CopilotMessage } from "../hooks/useCopilotChat";

export interface AdminCopilotViewProps {
  /** API endpoint for the copilot chat (default: /api/copilot/chat) */
  endpoint?: string;
  /** Render the page header (title + new conversation button) */
  renderHeader?: (onNewConversation: () => void) => React.ReactNode;
  labels?: {
    title?: string;
    newConversation?: string;
    noMessages?: string;
    noMessagesDesc?: string;
    inputPlaceholder?: string;
    sendButton?: string;
    sendingButton?: string;
    you?: string;
    assistant?: string;
    errorLabel?: string;
  };
  className?: string;
}

function MessageBubble({
  msg,
  labels,
}: {
  msg: CopilotMessage;
  labels: AdminCopilotViewProps["labels"];
}) {
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
        <Text className="whitespace-pre-wrap text-sm leading-relaxed">
          {msg.content}
        </Text>
        {msg.durationMs && (
          <Span className="mt-1 block text-xs opacity-60">
            {(msg.durationMs / 1000).toFixed(1)}s
          </Span>
        )}
      </Div>
    </Div>
  );
}

export function AdminCopilotView({
  endpoint,
  renderHeader,
  labels = {},
  className = "",
}: AdminCopilotViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, startNewConversation, isLoading, error } =
    useCopilotChat({ endpoint });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <Div className={`space-y-4 ${className}`}>
      {renderHeader ? (
        renderHeader(startNewConversation)
      ) : (
        <Div className="flex items-center justify-between">
          <Heading level={2}>{labels.title ?? "AI Copilot"}</Heading>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startNewConversation}
          >
            {labels.newConversation ?? "New Conversation"}
          </Button>
        </Div>
      )}

      <Div className="flex flex-col rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 h-[calc(100vh-260px)]">
        {/* Messages */}
        <Div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <Div className="flex flex-col items-center justify-center h-full text-center">
              <Text className="font-medium">
                {labels.noMessages ?? "No messages yet"}
              </Text>
              <Text variant="secondary" className="text-sm mt-1">
                {labels.noMessagesDesc ?? "Ask anything to get started"}
              </Text>
            </Div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} labels={labels} />
          ))}
          {isLoading && (
            <Div className="flex justify-start">
              <Div className="rounded-2xl rounded-tl-sm bg-neutral-100 dark:bg-slate-700 px-4 py-2.5">
                <Span className="text-sm opacity-60 animate-pulse">
                  Thinking…
                </Span>
              </Div>
            </Div>
          )}
          {error && (
            <Text className="text-center text-sm text-red-500">
              {labels.errorLabel ?? "An error occurred. Please try again."}
            </Text>
          )}
          <div ref={messagesEndRef} />
        </Div>

        {/* Input */}
        <Div className="border-t border-neutral-200 dark:border-slate-700 p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={labels.inputPlaceholder ?? "Ask anything…"}
              disabled={isLoading}
              className="flex-1 h-10 rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:ring-2 ring-primary/20 transition disabled:opacity-60"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !input.trim()}
              className="shrink-0"
            >
              {isLoading
                ? (labels.sendingButton ?? "Sending…")
                : (labels.sendButton ?? "Send")}
            </Button>
          </form>
        </Div>
      </Div>
    </Div>
  );
}
