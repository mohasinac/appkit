"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface SellerOrdersViewProps {
  labels?: { title?: string; emptyText?: string };
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderTable: (selectedIds: string[], onSelectionChange: (ids: string[]) => void, isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  renderModal?: () => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function SellerOrdersView({
  labels = {},
  renderSearch,
  renderFilters,
  renderActiveFilters,
  renderTable,
  renderPagination,
  renderModal,
  total = 0,
  isLoading = false,
  className = "",
}: SellerOrdersViewProps) {
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
      {renderModal?.()}
    </Div>
  );
}
