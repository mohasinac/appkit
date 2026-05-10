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
  /** Rendered below the sub-listing section and above the tabs (e.g. group carousel). */
  renderGroupSection?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
}

export function PreOrderDetailView({
  renderGallery,
  renderInfo,
  renderBuyBar,
  renderSublistingSection,
  renderGroupSection,
  renderTabs,
  renderRelated,
  isLoading = false,
  ...rest
}: PreOrderDetailViewProps) {
  const sublistingNode = renderSublistingSection?.();
  const groupNode = renderGroupSection?.();
  const afterMainNode =
    sublistingNode || groupNode ? (
      <React.Fragment>
        {sublistingNode}
        {groupNode}
      </React.Fragment>
    ) : undefined;

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
      afterMain={afterMainNode}
      belowFold={[renderTabs?.(), renderRelated?.()]}
    />
  );
}
