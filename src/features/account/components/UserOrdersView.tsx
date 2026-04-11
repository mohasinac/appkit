"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserOrdersViewLabels {
  title?: string;
}

export interface UserOrdersViewProps {
  labels?: UserOrdersViewLabels;
  renderTabs?: () => React.ReactNode;
  renderToolbar?: () => React.ReactNode;
  renderTable?: () => React.ReactNode;
  renderPagination?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function UserOrdersView({
  labels = {},
  renderTabs,
  renderToolbar,
  renderTable,
  renderPagination,
  renderActiveFilters,
  isLoading = false,
  className = "",
}: UserOrdersViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderTabs?.()}
      {renderToolbar?.()}
      {renderActiveFilters?.()}
      {renderTable?.()}
      {renderPagination?.()}
    </Div>
  );
}
