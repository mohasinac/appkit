"use client";

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";

export interface AdminUsersViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderDrawer?: () => React.ReactNode;
  renderConfirmModal?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminUsersView({
  renderDrawer,
  renderConfirmModal,
  children,
  isDashboard = true,
  ...listingProps
}: AdminUsersViewProps) {
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
