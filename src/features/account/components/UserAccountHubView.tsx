import React from "react";
import { StackedViewShell } from "../../../ui/components/StackedViewShell";
import type { StackedViewShellProps } from "../../../ui/components/StackedViewShell";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

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
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function UserAccountHubView({
  labels = {},
  renderProfile,
  renderNav,
  renderRecentOrders,
  pageRegionCards = [],
  ...rest
}: UserAccountHubViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[
        <AdminComposableRegion key="page-region" pageId="user" initialCards={pageRegionCards} />,
        renderProfile?.(),
        renderNav?.(),
        renderRecentOrders?.(),
      ]}
    />
  );
}
