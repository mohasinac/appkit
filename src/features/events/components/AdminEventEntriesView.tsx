import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface AdminEventEntriesViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  /** Back-link and event title header */
  renderHeader?: () => React.ReactNode;
  /** Stats banner (total / approved / flagged counts) */
  renderStats?: () => React.ReactNode;
  /** Filter bar (status dropdown, sort, search) */
  renderFilters?: () => React.ReactNode;
  /** Entries data table */
  renderTable: () => React.ReactNode;
  /** Pagination footer */
  renderPagination?: () => React.ReactNode;
  /** Entry review side-drawer */
  renderReviewDrawer?: () => React.ReactNode;
}

export function AdminEventEntriesView({
  renderHeader,
  renderStats,
  renderFilters,
  renderTable,
  renderPagination,
  renderReviewDrawer,
  ...rest
}: AdminEventEntriesViewProps) {
  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      renderHeader={renderHeader}
      sections={[
        renderStats?.(),
        renderFilters?.(),
        renderTable(),
        renderPagination?.(),
      ]}
      overlays={renderReviewDrawer?.()}
    />
  );
}
