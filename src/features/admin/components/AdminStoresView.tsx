"use client";

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";

export interface AdminStoresViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderConfirmModal?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminStoresView({
  renderConfirmModal,
  children,
  isDashboard = true,
  ...listingProps
}: AdminStoresViewProps) {
  return (
    <>
      <ListingLayout {...listingProps} isDashboard={isDashboard}>
        {children}
      </ListingLayout>
      {renderConfirmModal?.()}
    </>
  );
}
