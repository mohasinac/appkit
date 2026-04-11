"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface ChatListLabels {
  title?: string;
}

export interface ChatListProps {
  labels?: ChatListLabels;
  isLoading?: boolean;
  hasItems: boolean;
  renderLoading?: () => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  renderList: () => React.ReactNode;
  className?: string;
}

export function ChatList({
  labels = {},
  isLoading = false,
  hasItems,
  renderLoading,
  renderEmptyState,
  renderList,
  className = "",
}: ChatListProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={4} className="mb-3 font-semibold">
          {labels.title}
        </Heading>
      )}
      {isLoading
        ? (renderLoading?.() ?? null)
        : hasItems
          ? renderList()
          : (renderEmptyState?.() ?? null)}
    </Div>
  );
}
