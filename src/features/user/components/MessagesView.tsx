"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface MessagesViewProps {
  labels?: { title?: string; emptyText?: string };
  renderChatList: (activeThreadId: string | null, onSelect: (id: string) => void, isLoading: boolean) => React.ReactNode;
  renderChatWindow?: (threadId: string) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function MessagesView({
  labels = {},
  renderChatList,
  renderChatWindow,
  isLoading = false,
  className = "",
}: MessagesViewProps) {
  const [activeThread, setActiveThread] = React.useState<string | null>(null);
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      <Div className="flex gap-4 h-[600px]">
        <Div className="w-80 border rounded overflow-auto">
          {renderChatList(activeThread, setActiveThread, isLoading)}
        </Div>
        <Div className="flex-1 border rounded overflow-auto">
          {activeThread && renderChatWindow?.(activeThread)}
        </Div>
      </Div>
    </Div>
  );
}
