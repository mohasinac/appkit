import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminReviewsViewProps extends ListingViewShellProps {
  /** @deprecated Use `detailView` instead. */
  renderDetailView?: () => React.ReactNode;
}

export function AdminReviewsView({
  renderDetailView,
  ...props
}: AdminReviewsViewProps) {
  return <ListingViewShell portal="admin" {...props} detailView={renderDetailView?.()} />;
}
