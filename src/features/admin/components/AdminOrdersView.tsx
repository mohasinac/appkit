"use client";

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";

export interface AdminOrdersViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderDrawer?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminOrdersView({
  renderDrawer,
  children,
  isDashboard = true,
  ...listingProps
}: AdminOrdersViewProps) {
  return (
    <>
      <ListingLayout {...listingProps} isDashboard={isDashboard}>
        {children}
      </ListingLayout>
      {renderDrawer?.()}
    </>
  );
}
