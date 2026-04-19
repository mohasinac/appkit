import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";

export interface AdminBlogViewProps extends ListingViewShellProps {}

export function AdminBlogView(props: AdminBlogViewProps) {
  return <ListingViewShell portal="admin" {...props} />;
}
