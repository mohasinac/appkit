import React from "react";
import { DetailViewShell } from "../../../ui";
import type { DetailViewShellProps } from "../../../ui";

/**
 * PreOrderDetailView — shell for pre-order product detail pages.
 * Uses grid-2 layout (gallery | info+buyBar).
 */
export interface PreOrderDetailViewProps extends Omit<
  DetailViewShellProps,
  "mainSlots" | "belowFold" | "layout" | "afterMain"
> {
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  renderBuyBar?: () => React.ReactNode;
  /** Rendered between the main grid and the below-fold tabs (e.g. sub-listing carousel). */
  renderSublistingSection?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
}

export function PreOrderDetailView({
  renderGallery,
  renderInfo,
  renderBuyBar,
  renderSublistingSection,
  renderTabs,
  renderRelated,
  isLoading = false,
  ...rest
}: PreOrderDetailViewProps) {
  return (
    <DetailViewShell
      portal="public"
      {...rest}
      layout="grid-2"
      isLoading={isLoading}
      mainSlots={[
        renderGallery?.(isLoading),
        <React.Fragment key="info">
          {renderInfo?.(isLoading)}
          {renderBuyBar?.()}
        </React.Fragment>,
      ]}
      afterMain={renderSublistingSection?.()}
      belowFold={[renderTabs?.(), renderRelated?.()]}
    />
  );
}
