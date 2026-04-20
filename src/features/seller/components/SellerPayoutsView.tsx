import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerPayoutsViewProps extends Omit<
  StackedViewShellProps,
  "sections" | "renderHeader"
> {
  labels?: { title?: string; requestButton?: string };
  renderHeader?: (onRequest: () => void) => React.ReactNode;
  renderStats?: (isLoading: boolean) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderTable?: (isLoading: boolean) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  renderModal?: () => React.ReactNode;
  total?: number;
  isLoading?: boolean;
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
  ...rest
}: SellerPayoutsViewProps) {
  return (
    <StackedViewShell
      portal="seller"
      {...rest}
      title={labels.title}
      renderHeader={renderHeader ? () => renderHeader(() => {}) : undefined}
      sections={[
        renderStats?.(isLoading),
        renderFilters?.(),
        renderActiveFilters?.(),
        renderTable?.(isLoading),
        renderPagination?.(total),
      ]}
      overlays={renderModal?.()}
    />
  );
}
