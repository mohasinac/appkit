"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface PreOrdersViewProps {
  labels?: { title?: string; emptyText?: string };
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderGrid: (isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function PreOrdersView({
  labels = {},
  renderSearch,
  renderFilters,
  renderGrid,
  renderPagination,
  total = 0,
  isLoading = false,
  className = "",
}: PreOrdersViewProps) {
  const [search, setSearch] = React.useState("");
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderSearch?.(search, setSearch)}
      {renderFilters?.()}
      {renderGrid(isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
