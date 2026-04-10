"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface AdminCategoriesViewProps {
  labels?: { title?: string; addButton?: string; emptyText?: string; };
  renderHeader?: (onAdd: () => void) => React.ReactNode;
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderTabs?: (activeTab: string, onChange: (t: string) => void) => React.ReactNode;
  renderTable: (selectedIds: string[], onSelectionChange: (ids: string[]) => void, isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  renderDrawer?: () => React.ReactNode;
  renderModal?: () => React.ReactNode;
  renderBulkActions?: (selectedIds: string[], onClear: () => void) => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function AdminCategoriesView({ labels = {}, renderHeader, renderSearch, renderFilters, renderActiveFilters, renderTabs, renderTable, renderPagination, renderDrawer, renderModal, renderBulkActions, total = 0, isLoading = false, className = "" }: AdminCategoriesViewProps) {
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  return (
    <Div className={className}>
      {renderHeader ? renderHeader(() => {}) : labels.title ? <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading> : null}
      {renderTabs?.(tab, setTab)}
      {renderSearch?.(search, setSearch)}
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {renderBulkActions?.(selectedIds, () => setSelectedIds([]))}
      {renderTable(selectedIds, setSelectedIds, isLoading)}
      {renderPagination?.(total)}
      {renderDrawer?.()}
      {renderModal?.()}
    </Div>
  );
}