"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface UserOrdersViewProps {
  labels?: { title?: string; emptyText?: string };
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderList: (isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function UserOrdersView({
  labels = {},
  renderSearch,
  renderFilters,
  renderList,
  renderPagination,
  total = 0,
  isLoading = false,
  className = "",
}: UserOrdersViewProps) {
  const [search, setSearch] = React.useState("");
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderSearch?.(search, setSearch)}
      {renderFilters?.()}
      {renderList(isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
