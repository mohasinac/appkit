"use client";

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";

export interface AdminProductsViewProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  renderDrawer?: () => React.ReactNode;
  renderModal?: () => React.ReactNode;
  children: React.ReactNode;
}

export function AdminProductsView({
  renderDrawer,
  renderModal,
  children,
  isDashboard = true,
  ...listingProps
}: AdminProductsViewProps) {
  return (
    <>
      <ListingLayout {...listingProps} isDashboard={isDashboard}>
        {children}
      </ListingLayout>
      {renderDrawer?.()}
      {renderModal?.()}
    </>
  );
}
