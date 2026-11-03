import type { ReactNode } from "react";
import { StackedViewShell } from "../../../ui/components/StackedViewShell";
import type { StackedViewShellProps } from "../../../ui/components/StackedViewShell";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface UserOrderTrackViewLabels {
  title?: string;
  backLabel?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
}

export interface UserOrderTrackViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: UserOrderTrackViewLabels;
  renderBack?: () => ReactNode;
  renderTracking?: () => ReactNode;
  renderNotFound?: () => ReactNode;
  isNotFound?: boolean;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function UserOrderTrackView({
  renderBack,
  renderTracking,
  renderNotFound,
  isNotFound = false,
  pageRegionCards = [],
  ...rest
}: UserOrderTrackViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      sections={[
        renderBack?.(),
        isNotFound ? renderNotFound?.() : renderTracking?.(),
        <AdminComposableRegion key="page-region" pageId="user-orders-id-track" initialCards={pageRegionCards} />,
      ]}
    />
  );
}
