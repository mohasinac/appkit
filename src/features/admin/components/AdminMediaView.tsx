"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface AdminMediaViewProps {
  labels?: { title?: string; addButton?: string; emptyText?: string };
  renderHeader?: () => React.ReactNode;
  renderSearch?: () => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderTable: () => React.ReactNode;
  renderPagination?: () => React.ReactNode;
  renderDrawer?: () => React.ReactNode;
  renderModal?: () => React.ReactNode;
  renderBulkActions?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AdminMediaView({
  labels = {},
  renderHeader,
  renderSearch,
  renderFilters,
  renderActiveFilters,
  renderTabs,
  renderTable,
  renderPagination,
  renderDrawer,
  renderModal,
  renderBulkActions,
  isLoading = false,
  className = "",
}: AdminMediaViewProps) {
  return (
    <Div className={className}>
      {renderHeader ? (
        renderHeader()
      ) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      ) : null}
      {renderTabs?.()}
      {renderSearch?.()}
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {renderBulkActions?.()}
      {renderTable()}
      {renderPagination?.()}
      {renderDrawer?.()}
      {renderModal?.()}
    </Div>
  );
}
