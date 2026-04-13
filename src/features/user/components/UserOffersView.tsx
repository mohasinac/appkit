"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface UserOffersViewProps {
  labels?: { title?: string; emptyText?: string };
  renderFilters?: () => React.ReactNode;
  renderList: (isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function UserOffersView({
  labels = {},
  renderFilters,
  renderList,
  renderPagination,
  total = 0,
  isLoading = false,
  className = "",
}: UserOffersViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderFilters?.()}
      {renderList(isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
