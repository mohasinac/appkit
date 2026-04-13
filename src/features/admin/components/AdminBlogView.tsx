"use client";

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";

export interface AdminBlogViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderDrawer?: () => React.ReactNode;
  renderConfirmModal?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminBlogView({
  renderDrawer,
  renderConfirmModal,
  children,
  isDashboard = true,
  ...listingProps
}: AdminBlogViewProps) {
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
