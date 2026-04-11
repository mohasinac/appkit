import React from "react";

export interface AdminEventEntriesViewProps {
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
  isLoading?: boolean;
  className?: string;
}

export function AdminEventEntriesView({
  renderHeader,
  renderStats,
  renderFilters,
  renderTable,
  renderPagination,
  renderReviewDrawer,
  className = "",
}: AdminEventEntriesViewProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {renderHeader?.()}
      {renderStats?.()}
      {renderFilters?.()}
      {renderTable()}
      {renderPagination?.()}
      {renderReviewDrawer?.()}
    </div>
  );
}
