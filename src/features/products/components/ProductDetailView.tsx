import React from "react";
import { DetailViewShell } from "../../../ui";
import type { DetailViewShellProps } from "../../../ui";

export interface ProductDetailViewProps extends Omit<
  DetailViewShellProps,
  "mainSlots" | "belowFold" | "layout"
> {
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  /** Sticky actions sidebar (desktop col 3). Also used for mobile BuyBar. */
  renderActions?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
}

export function ProductDetailView({
  renderGallery,
  renderInfo,
  renderActions,
  renderTabs,
  renderRelated,
  isLoading = false,
  ...rest
}: ProductDetailViewProps) {
  return (
    <DetailViewShell
      {...rest}
      layout="grid-3"
      isLoading={isLoading}
      mainSlots={[
        renderGallery?.(isLoading),
        renderInfo?.(isLoading),
        renderActions?.(),
      ]}
      belowFold={[renderTabs?.(), renderRelated?.()]}
    />
  );
}
