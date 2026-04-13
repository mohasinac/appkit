"use client";

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";

export interface AdminPayoutsViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderDrawer?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminPayoutsView({
  renderDrawer,
  children,
  isDashboard = true,
  ...listingProps
}: AdminPayoutsViewProps) {
  return (
    <>
      <ListingLayout {...listingProps} isDashboard={isDashboard}>
        {children}
      </ListingLayout>
      {renderDrawer?.()}
    </>
  );
}
