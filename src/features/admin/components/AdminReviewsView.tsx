"use client";

import React from "react";
import { ListingLayout } from "@mohasinac/ui";
import type { ListingLayoutProps } from "@mohasinac/ui";

export interface AdminReviewsViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderDrawer?: () => React.ReactNode;
  renderConfirmModal?: () => React.ReactNode;
  renderDetailView?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminReviewsView({
  renderDrawer,
  renderConfirmModal,
  renderDetailView,
  children,
  isDashboard = true,
  ...listingProps
}: AdminReviewsViewProps) {
  // When a detail view is provided, short-circuit to it
  if (renderDetailView) {
    return <>{renderDetailView()}</>;
  }
  return (
    <>
      <ListingLayout {...listingProps} isDashboard={isDashboard}>
        {children}
      </ListingLayout>
      {renderDrawer?.()}
      {renderConfirmModal?.()}
    </>
  );
}
