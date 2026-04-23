import React from "react";
import { DetailViewShell } from "../../../ui";
import type { DetailViewShellProps } from "../../../ui";

export interface ProductDetailViewProps extends Omit<
  DetailViewShellProps,
  "mainSlots" | "belowFold" | "layout"
> {
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  /**
   * Desktop sticky action rail (col 3). Rendered inline on mobile — use
   * `useBottomActions` in the consumer to also register mobile bottom actions.
   */
  renderActions?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
  /**
   * When true (default), the action rail (col 3) becomes sticky on desktop so
   * it stays visible while the user scrolls the gallery and info columns.
   */
  stickyActionRail?: boolean;
  /**
   * Top offset for the sticky action rail. Defaults to `"top-20"` (below the
   * title bar on typical letitrip page layout).
   */
  stickyRailOffset?: string;
}

export function ProductDetailView({
  renderGallery,
  renderInfo,
  renderActions,
  renderTabs,
  renderRelated,
  isLoading = false,
  stickyActionRail = true,
  stickyRailOffset = "top-20",
  ...rest
}: ProductDetailViewProps) {
  return (
    <DetailViewShell
      portal="public"
      {...rest}
      layout="grid-3"
      isLoading={isLoading}
      stickyActionRail={stickyActionRail}
      stickyRailOffset={stickyRailOffset}
      mainSlots={[
        renderGallery?.(isLoading),
        renderInfo?.(isLoading),
        renderActions?.(),
      ]}
      belowFold={[renderTabs?.(), renderRelated?.()]}
    />
  );
}
