"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserNotificationsViewLabels {
  title?: string;
}

export interface UserNotificationsViewProps {
  labels?: UserNotificationsViewLabels;
  renderToolbar?: () => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderBulkActions?: () => React.ReactNode;
  renderList?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderPagination?: () => React.ReactNode;
  isEmpty?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function UserNotificationsView({
  labels = {},
  renderToolbar,
  renderFilters,
  renderActiveFilters,
  renderBulkActions,
  renderList,
  renderEmpty,
  renderPagination,
  isEmpty = false,
  isLoading = false,
  className = "",
}: UserNotificationsViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderToolbar?.()}
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {renderBulkActions?.()}
      {isEmpty ? renderEmpty?.() : renderList?.()}
      {renderPagination?.()}
    </Div>
  );
}
