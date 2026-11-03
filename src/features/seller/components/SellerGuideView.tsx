import type { ReactNode } from "react";
import { StackedViewShell } from "../../../ui/components/StackedViewShell";
import type { StackedViewShellProps } from "../../../ui/components/StackedViewShell";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface SellerGuideViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  sections?: ReactNode;
  cta?: ReactNode;
  renderSections?: () => ReactNode;
  renderCTA?: () => ReactNode;
  /**
   * Stable, hand-chosen page-region id (Phase 12) — this one view is shared
   * by three distinct routes (`/seller-guide` and its two sub-guides), so
   * every caller computes its own route-template-derived id rather than this
   * component guessing one.
   */
  pageId: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function SellerGuideView({
  labels = {},
  sections,
  cta,
  renderSections,
  renderCTA,
  pageId,
  pageRegionCards = [],
  ...rest
}: SellerGuideViewProps) {
  return (
    <StackedViewShell
      portal="seller"
      {...rest}
      title={labels.title}
      sections={[
        <AdminComposableRegion key="page-region" pageId={pageId} initialCards={pageRegionCards} />,
        sections ?? renderSections?.(),
        cta ?? renderCTA?.(),
      ]}
    />
  );
}
