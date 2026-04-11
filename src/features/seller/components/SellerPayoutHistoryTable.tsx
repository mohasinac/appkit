"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface SellerPayoutHistoryTableLabels {
  title?: string;
}

export interface SellerPayoutHistoryTableProps {
  labels?: SellerPayoutHistoryTableLabels;
  isLoading?: boolean;
  hasRows: boolean;
  renderLoading?: () => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  renderTable: () => React.ReactNode;
  className?: string;
}

export function SellerPayoutHistoryTable({
  labels = {},
  isLoading = false,
  hasRows,
  renderLoading,
  renderEmptyState,
  renderTable,
  className = "",
}: SellerPayoutHistoryTableProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={2} className="mb-4">
          {labels.title}
        </Heading>
      )}

      {isLoading
        ? (renderLoading?.() ?? null)
        : hasRows
          ? renderTable()
          : (renderEmptyState?.() ?? null)}
    </Div>
  );
}
