import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminStoresViewProps extends ListingViewShellProps {}

export function AdminStoresView(props: AdminStoresViewProps) {
  return <ListingViewShell {...props} />;
}
