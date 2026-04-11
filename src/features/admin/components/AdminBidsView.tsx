"use client";

import React from "react";
import { ListingLayout } from "@mohasinac/ui";
import type { ListingLayoutProps } from "@mohasinac/ui";

export interface AdminBidsViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderDrawer?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminBidsView({
  renderDrawer,
  children,
  isDashboard = true,
  ...listingProps
}: AdminBidsViewProps) {
  return (
    <>
      <ListingLayout {...listingProps} isDashboard={isDashboard}>
        {children}
      </ListingLayout>
      {renderDrawer?.()}
    </>
  );
}
