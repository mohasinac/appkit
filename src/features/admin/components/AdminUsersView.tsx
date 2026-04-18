import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminUsersViewProps extends ListingViewShellProps {}

export function AdminUsersView(props: AdminUsersViewProps) {
  return <ListingViewShell {...props} />;
}
