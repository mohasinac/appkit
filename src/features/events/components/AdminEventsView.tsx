import React from "react";

export interface AdminEventsViewProps {
  /** Toolbar: search + sort controls */
  renderToolbar?: () => React.ReactNode;
  /** Filter sidebar / drawer content */
  renderFilters?: () => React.ReactNode;
  /** Active filter chips row */
  renderActiveFilters?: () => React.ReactNode;
  /** Data table / grid */
  renderTable: () => React.ReactNode;
  /** Pagination footer */
  renderPagination?: () => React.ReactNode;
  /** Create / edit event form drawer */
  renderFormDrawer?: () => React.ReactNode;
  /** Page header (title + "New Event" button) */
  renderHeader?: () => React.ReactNode;
  /** Bulk action bar — shown when rows are selected */
  renderBulkActions?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AdminEventsView({
  renderToolbar,
  renderFilters,
  renderActiveFilters,
  renderTable,
  renderPagination,
  renderFormDrawer,
  renderHeader,
  renderBulkActions,
  className = "",
}: AdminEventsViewProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {renderHeader?.()}
      {renderToolbar?.()}
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {renderBulkActions?.()}
      {renderTable()}
      {renderPagination?.()}
      {renderFormDrawer?.()}
    </div>
  );
}
