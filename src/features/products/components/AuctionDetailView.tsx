import React from "react";
import { DetailViewShell, Div } from "../../../ui";
import type { DetailViewShellProps } from "../../../ui";

export interface AuctionDetailViewProps extends Omit<
  DetailViewShellProps,
  "mainSlots" | "belowFold" | "layout" | "afterMain"
> {
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  /** Desktop sticky bid sidebar (hidden on mobile, shown in col 3) */
  renderBidForm?: () => React.ReactNode;
  /** Mobile bid form shown below the grid on small screens */
  renderMobileBidForm?: () => React.ReactNode;
  /** Rendered between the main grid and the below-fold tabs (e.g. sub-listing carousel). */
  renderSublistingSection?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderBidHistory?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
}

export function AuctionDetailView({
  renderGallery,
  renderInfo,
  renderBidForm,
  renderMobileBidForm,
  renderSublistingSection,
  renderTabs,
  renderBidHistory,
  renderRelated,
  isLoading = false,
  ...rest
}: AuctionDetailViewProps) {
  const mobileBid = renderMobileBidForm?.();
  const sublistingSection = renderSublistingSection?.();
  const afterMainContent = (mobileBid || sublistingSection) ? (
    <>
      {mobileBid}
      {sublistingSection}
    </>
  ) : undefined;

  return (
    <DetailViewShell
      portal="public"
      {...rest}
      layout="grid-3"
      isLoading={isLoading}
      mainSlots={[
        renderGallery?.(isLoading),
        renderInfo?.(isLoading),
        <Div key="bid" className="hidden lg:block">
          {renderBidForm?.()}
        </Div>,
      ]}
      afterMain={afterMainContent}
      belowFold={[renderTabs?.(), renderBidHistory?.(), renderRelated?.()]}
    />
  );
}
