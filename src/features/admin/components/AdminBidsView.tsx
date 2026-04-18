import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminBidsViewProps extends ListingViewShellProps {}

export function AdminBidsView(props: AdminBidsViewProps) {
  return <ListingViewShell {...props} />;
}
