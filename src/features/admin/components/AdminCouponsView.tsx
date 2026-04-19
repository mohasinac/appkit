import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminCouponsViewProps extends ListingViewShellProps {}

export function AdminCouponsView(props: AdminCouponsViewProps) {
  return <ListingViewShell portal="admin" {...props} />;
}
