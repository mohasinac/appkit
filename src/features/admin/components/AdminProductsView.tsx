import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminProductsViewProps extends ListingViewShellProps {}

export function AdminProductsView(props: AdminProductsViewProps) {
  return <ListingViewShell portal="admin" {...props} />;
}
