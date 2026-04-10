"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserNotificationsViewProps {
  labels?: { title?: string; markAllRead?: string };
  renderFilters?: () => React.ReactNode;
  renderBulkActions?: (onMarkAllRead: () => void) => React.ReactNode;
  renderList: (isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function UserNotificationsView({
  labels = {},
  renderFilters,
  renderBulkActions,
  renderList,
  renderPagination,
  total = 0,
  isLoading = false,
  className = "",
}: UserNotificationsViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderBulkActions?.(() => {})}
      {renderFilters?.()}
      {renderList(isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
