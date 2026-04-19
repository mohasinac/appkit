import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface UserAccountHubViewLabels {
  title?: string;
  recentOrders?: string;
}

export interface UserAccountHubViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: UserAccountHubViewLabels;
  renderProfile?: () => React.ReactNode;
  renderNav?: () => React.ReactNode;
  renderRecentOrders?: () => React.ReactNode;
}

export function UserAccountHubView({
  labels = {},
  renderProfile,
  renderNav,
  renderRecentOrders,
  ...rest
}: UserAccountHubViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[renderProfile?.(), renderNav?.(), renderRecentOrders?.()]}
    />
  );
}
