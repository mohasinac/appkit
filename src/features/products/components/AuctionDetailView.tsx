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
  renderTabs?: () => React.ReactNode;
  renderBidHistory?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
}

export function AuctionDetailView({
  renderGallery,
  renderInfo,
  renderBidForm,
  renderMobileBidForm,
  renderTabs,
  renderBidHistory,
  renderRelated,
  isLoading = false,
  ...rest
}: AuctionDetailViewProps) {
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
      afterMain={renderMobileBidForm?.()}
      belowFold={[renderTabs?.(), renderBidHistory?.(), renderRelated?.()]}
    />
  );
}
