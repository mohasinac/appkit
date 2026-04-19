import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminOrdersViewProps extends ListingViewShellProps {}

export function AdminOrdersView(props: AdminOrdersViewProps) {
  return <ListingViewShell portal="admin" {...props} />;
}
