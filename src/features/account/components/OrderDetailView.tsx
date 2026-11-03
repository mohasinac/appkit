import React from "react";
import { StackedViewShell } from "../../../ui/components/StackedViewShell";
import type { StackedViewShellProps } from "../../../ui/components/StackedViewShell";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface OrderDetailViewLabels {
  title?: string;
  backLabel?: string;
}

export interface OrderDetailViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: OrderDetailViewLabels;
  renderBack?: () => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderItems?: () => React.ReactNode;
  renderAddress?: () => React.ReactNode;
  renderPayment?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
  isLoading?: boolean;
  isNotFound?: boolean;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function OrderDetailView({
  labels = {},
  renderBack,
  renderHeader,
  renderItems,
  renderAddress,
  renderPayment,
  renderActions,
  pageRegionCards = [],
  ...rest
}: OrderDetailViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[
        renderBack?.(),
        renderHeader?.(),
        renderActions?.(),
        renderItems?.(),
        renderAddress?.(),
        renderPayment?.(),
        <AdminComposableRegion key="page-region" pageId="user-orders-id" initialCards={pageRegionCards} />,
      ]}
    />
  );
}
