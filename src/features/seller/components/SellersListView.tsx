"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface SellersListViewProps {
  labels?: { title?: string; emptyText?: string };
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderTable: (selectedIds: string[], onSelectionChange: (ids: string[]) => void, isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function SellersListView({
  labels = {},
  renderSearch,
  renderFilters,
  renderActiveFilters,
  renderTable,
  renderPagination,
  total = 0,
  isLoading = false,
  className = "",
}: SellersListViewProps) {
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderSearch?.(search, setSearch)}
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {renderTable(selectedIds, setSelectedIds, isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
