import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminFaqsViewProps extends ListingViewShellProps {}

export function AdminFaqsView(props: AdminFaqsViewProps) {
  return <ListingViewShell {...props} />;
}
