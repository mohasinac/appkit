"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface SellerPayoutsViewProps {
  labels?: { title?: string; requestButton?: string };
  renderHeader?: (onRequest: () => void) => React.ReactNode;
  renderStats?: (isLoading: boolean) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderTable: (isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  renderModal?: () => React.ReactNode;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function SellerPayoutsView({
  labels = {},
  renderHeader,
  renderStats,
  renderFilters,
  renderActiveFilters,
  renderTable,
  renderPagination,
  renderModal,
  total = 0,
  isLoading = false,
  className = "",
}: SellerPayoutsViewProps) {
  return (
    <Div className={className}>
      {renderHeader ? renderHeader(() => {}) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      ) : null}
      {renderStats?.(isLoading)}
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {renderTable(isLoading)}
      {renderPagination?.(total)}
      {renderModal?.()}
    </Div>
  );
}
