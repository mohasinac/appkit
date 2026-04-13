"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface AuctionsViewProps {
  labels?: { title?: string; emptyText?: string };
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderSort?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  renderGrid: (isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function AuctionsView({
  labels = {},
  renderSearch,
  renderFilters,
  renderActiveFilters,
  renderSort,
  renderGrid,
  renderPagination,
  total = 0,
  isLoading = false,
  className = "",
}: AuctionsViewProps) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("");
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      <Div className="flex gap-2 mb-4">
        {renderSearch?.(search, setSearch)}
        {renderSort?.(sort, setSort)}
      </Div>
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {renderGrid(isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
