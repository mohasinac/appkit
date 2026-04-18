import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface UserNotificationsViewLabels {
  title?: string;
}

export interface UserNotificationsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: UserNotificationsViewLabels;
  renderToolbar?: () => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderActiveFilters?: () => React.ReactNode;
  renderBulkActions?: () => React.ReactNode;
  renderList?: () => React.ReactNode;
  renderPagination?: () => React.ReactNode;
}

export function UserNotificationsView({
  labels = {},
  renderToolbar,
  renderFilters,
  renderActiveFilters,
  renderBulkActions,
  renderList,
  renderPagination,
  ...rest
}: UserNotificationsViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[
        renderToolbar?.(),
        renderFilters?.(),
        renderActiveFilters?.(),
        renderBulkActions?.(),
        renderList?.(),
        renderPagination?.(),
      ]}
    />
  );
}
