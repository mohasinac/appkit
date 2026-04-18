import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminPayoutsViewProps extends ListingViewShellProps {}

export function AdminPayoutsView(props: AdminPayoutsViewProps) {
  return <ListingViewShell {...props} />;
}
